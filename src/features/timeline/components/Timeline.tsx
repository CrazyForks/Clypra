/**
 * Timeline component - Wrapper for TimelineContainer
 * Maintains backward compatibility with existing App.tsx integration
 */

import { TimelineContainer } from "./TimelineContainer";
import type { TimelineProps } from "../../../types";

/**
 * Timeline component
 *
 * This is a simple wrapper around TimelineContainer to maintain
 * backward compatibility with the existing App.tsx integration.
 */
export function Timeline(props: TimelineProps) {
  return <TimelineContainer {...props} />;
}
