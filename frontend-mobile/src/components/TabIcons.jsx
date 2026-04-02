import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function HomeIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function FacilityIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21H21M19 21H14M5 21H3M5 21H10M9 7H10M9 11H10M14 7H15M14 11H15M10 21V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V21M10 21H14"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function ParcelIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M4 7L12 11M4 7V17L12 21M12 11V21"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function SocialIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 20H22V18C22 16.3431 20.6569 15 19 15C18.0444 15 17.1931 15.4468 16.6438 16.1429M17 20H7M17 20V18C17 17.3438 16.8736 16.717 16.6438 16.1429M7 20H2V18C2 16.3431 3.34315 15 5 15C5.95561 15 6.80686 15.4468 7.35625 16.1429M7 20V18C7 17.3438 7.12642 16.717 7.35625 16.1429M7.35625 16.1429C8.0935 14.301 9.89482 13 12 13C14.1052 13 15.9065 14.301 16.6438 16.1429M15 7C15 8.65685 13.6569 10 12 10C10.3431 10 9 8.65685 9 7C9 5.34315 10.3431 4 12 4C13.6569 4 15 5.34315 15 7ZM21 10C21 11.1046 20.1046 12 19 12C17.8954 12 17 11.1046 17 10C17 8.89543 17.8954 8 19 8C20.1046 8 21 8.89543 21 10ZM7 10C7 11.1046 6.10457 12 5 12C3.89543 12 3 11.1046 3 10C3 8.89543 3.89543 8 5 8C6.10457 8 7 8.89543 7 10Z"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function EventIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function ChatbotIcon({ size = 24, color = '#000', filled }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z"
        stroke={color} strokeWidth={filled ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round"
        fill={filled ? color : 'none'} fillOpacity={filled ? 0.15 : 0}
      />
    </Svg>
  );
}

export function AnnouncementIcon({ size = 24, color = '#000' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      />
    </Svg>
  );
}
