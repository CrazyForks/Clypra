use tokio::io::AsyncReadExt;
use tokio::process::Command;

/// Downsampled peak envelope of the first audio stream (for waveform UI). Returns ~`bucket_count`
/// values in 0..1. If there is no audio, returns zeros.
#[tauri::command]
async fn audio_waveform_peaks(input_path: String, bucket_count: u32) -> Result<Vec<f32>, String> {
    let buckets = (bucket_count as usize).clamp(32, 512);
    let has = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "a",
            "-show_entries",
            "stream=index",
            "-of",
            "csv=p=0",
            &input_path,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stream_list = String::from_utf8_lossy(&has.stdout);
    if !has.status.success() || stream_list.trim().is_empty() {
        return Ok(vec![0.0; buckets]);
    }

    let probe = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            &input_path,
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    if !probe.status.success() {
        return Ok(vec![0.0; buckets]);
    }

    let duration: f64 = String::from_utf8_lossy(&probe.stdout)
        .trim()
        .parse()
        .unwrap_or(0.0);

    if !duration.is_finite() || duration <= 0.0 {
        return Ok(vec![0.0; buckets]);
    }

    const SR: u32 = 8000;
    let total_samples = ((duration * f64::from(SR)).floor() as usize).max(1);
    let samples_per_bucket = (total_samples / buckets).max(1);

    let mut child = Command::new("ffmpeg")
        .args([
            "-v",
            "error",
            "-i",
            &input_path,
            "-map",
            "0:a:0",
            "-ac",
            "1",
            "-ar",
            &SR.to_string(),
            "-f",
            "f32le",
            "-",
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("ffmpeg: {e}"))?;

    let mut stdout = child.stdout.take().ok_or("no ffmpeg stdout")?;

    let mut peaks = vec![0.0f32; buckets];
    let mut bucket_idx = 0usize;
    let mut count_in_bucket = 0usize;
    let mut max_in_bucket = 0.0f32;

    let mut stash: Vec<u8> = Vec::new();
    let mut buf = vec![0u8; 32 * 1024];

    loop {
        let n = stdout.read(&mut buf).await.map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        stash.extend_from_slice(&buf[..n]);
        let mut i = 0usize;
        while i + 4 <= stash.len() {
            let sample = f32::from_le_bytes(stash[i..i + 4].try_into().unwrap());
            i += 4;
            let a = sample.abs();
            if bucket_idx >= buckets {
                continue;
            }
            if count_in_bucket >= samples_per_bucket {
                peaks[bucket_idx] = max_in_bucket;
                bucket_idx += 1;
                count_in_bucket = 0;
                max_in_bucket = 0.0;
            }
            if a > max_in_bucket {
                max_in_bucket = a;
            }
            count_in_bucket += 1;
        }
        if i > 0 {
            stash.copy_within(i.., 0);
            stash.truncate(stash.len() - i);
        }
    }

    if bucket_idx < buckets && (count_in_bucket > 0 || max_in_bucket > 0.0) {
        peaks[bucket_idx] = max_in_bucket;
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        return Ok(vec![0.0; buckets]);
    }

    let mut max_peak = 0.0f32;
    for &p in &peaks {
        if p > max_peak {
            max_peak = p;
        }
    }
    if max_peak > 1.0e-12 {
        for p in &mut peaks {
            *p = (*p / max_peak).min(1.0);
        }
    }

    Ok(peaks)
}

/// Trim `input_path` to `[start_sec, end_sec)` and write to `output_path` using stream copy.
/// Requires `ffmpeg` on `PATH` (e.g. `brew install ffmpeg` on macOS).
#[tauri::command]
async fn trim_export(
    input_path: String,
    output_path: String,
    start_sec: f64,
    end_sec: f64,
) -> Result<(), String> {
    if !end_sec.is_finite() || !start_sec.is_finite() {
        return Err("Start and end times must be finite numbers.".into());
    }
    if end_sec <= start_sec {
        return Err("End time must be greater than start time.".into());
    }

    let ss = format!("{:.6}", start_sec);
    let to = format!("{:.6}", end_sec);

    let output = Command::new("ffmpeg")
        .args([
            "-y",
            "-i",
            &input_path,
            "-ss",
            &ss,
            "-to",
            &to,
            "-c",
            "copy",
            &output_path,
        ])
        .output()
        .await
        .map_err(|e| {
            format!(
                "Could not run ffmpeg ({e}). Install ffmpeg and ensure it is on your PATH."
            )
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let tail = stderr.trim();
        let msg = if tail.len() > 800 {
            format!("...{}", &tail[tail.len().saturating_sub(800)..])
        } else {
            tail.to_string()
        };
        return Err(format!("ffmpeg failed:\n{msg}"));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![trim_export, audio_waveform_peaks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
