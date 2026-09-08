/**
 * Preset definitions used by scripts/setup-presets.mjs.
 *
 * A preset = a participant role (permissions + media config + UI theme).
 * Field names follow the Cloudflare API schema for POST .../realtime/kit/{app_id}/presets.
 * Docs: https://developers.cloudflare.com/realtime/realtimekit/concepts/preset/
 */

const media = {
  screenshare: { frame_rate: 15, quality: 'hd' },
  video: { frame_rate: 30, quality: 'hd', simulcast: true },
  audio: { enable_high_bitrate: false, enable_stereo: false },
};

const ui = {
  design_tokens: {
    border_radius: 'rounded',
    border_width: 'thin',
    spacing_base: 4,
    theme: 'darkest',
    google_font: 'Inter',
    colors: {
      brand: { 300: '#2f6fed', 400: '#2a63d6', 500: '#2456bf', 600: '#1e49a3', 700: '#183b85' },
      background: { 600: '#2b2f36', 700: '#22262c', 800: '#1a1d22', 900: '#121417', 1000: '#0b0d10' },
      danger: '#ff5d5d',
      success: '#4bd37b',
      warning: '#ffb54a',
      text: '#eef2f7',
      text_on_brand: '#ffffff',
      video_bg: '#15181d',
    },
  },
};

const chatAll = {
  public: { can_send: true, text: true, files: true },
  private: { can_send: true, can_receive: true, text: true, files: true },
};

const noConnectedMeetings = {
  can_alter_connected_meetings: false,
  can_switch_connected_meetings: false,
  can_switch_to_parent_meeting: false,
};

const pluginsOn = {
  can_start: true,
  can_close: true,
  can_edit_config: true,
  config: {},
};

function permissions(overrides) {
  return {
    accept_waiting_requests: false,
    can_accept_production_requests: false,
    can_change_participant_permissions: false,
    can_edit_display_name: true,
    can_livestream: false,
    can_record: false,
    can_spotlight: false,
    chat: chatAll,
    connected_meetings: noConnectedMeetings,
    disable_participant_audio: false,
    disable_participant_screensharing: false,
    disable_participant_video: false,
    hidden_participant: false,
    kick_participant: false,
    media: {
      audio: { can_produce: 'ALLOWED' },
      video: { can_produce: 'ALLOWED' },
      screenshare: { can_produce: 'ALLOWED' },
    },
    pin_participant: false,
    plugins: pluginsOn,
    polls: { can_create: false, can_view: true, can_vote: true },
    recorder_type: 'NONE',
    show_participant_list: true,
    waiting_room_type: 'SKIP',
    transcription_enabled: false,
    ...overrides,
  };
}

const hostPermissions = {
  accept_waiting_requests: true,
  can_accept_production_requests: true,
  can_change_participant_permissions: true,
  can_record: true,
  can_spotlight: true,
  disable_participant_audio: true,
  disable_participant_screensharing: true,
  disable_participant_video: true,
  kick_participant: true,
  pin_participant: true,
  polls: { can_create: true, can_view: true, can_vote: true },
  connected_meetings: {
    can_alter_connected_meetings: true,
    can_switch_connected_meetings: true,
    can_switch_to_parent_meeting: true,
  },
};

export const PRESETS = [
  // ---- Conferencing (group call) ----
  {
    name: 'cfmeeting_host',
    config: {
      view_type: 'GROUP_CALL',
      max_screenshare_count: 2,
      max_video_streams: { desktop: 12, mobile: 6 },
      media,
    },
    permissions: permissions(hostPermissions),
    ui,
  },
  {
    name: 'cfmeeting_participant',
    config: {
      view_type: 'GROUP_CALL',
      max_screenshare_count: 2,
      max_video_streams: { desktop: 12, mobile: 6 },
      media,
    },
    permissions: permissions({}),
    ui,
  },
  // ---- Webinar (stage: only the host and invited speakers publish media) ----
  {
    name: 'cfmeeting_webinar_host',
    config: {
      view_type: 'WEBINAR',
      max_screenshare_count: 2,
      max_video_streams: { desktop: 9, mobile: 4 },
      media,
    },
    permissions: permissions({
      ...hostPermissions,
      stage_enabled: true,
      stage_access: 'ALLOWED',
      accept_stage_requests: true,
    }),
    ui,
  },
  {
    name: 'cfmeeting_webinar_participant',
    config: {
      view_type: 'WEBINAR',
      max_screenshare_count: 2,
      max_video_streams: { desktop: 9, mobile: 4 },
      media,
    },
    permissions: permissions({
      stage_enabled: true,
      stage_access: 'CAN_REQUEST',
      media: {
        audio: { can_produce: 'CAN_REQUEST' },
        video: { can_produce: 'CAN_REQUEST' },
        screenshare: { can_produce: 'CAN_REQUEST' },
      },
    }),
    ui,
  },
];
