import { getDatabase } from './database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    navigator: {
      userAgent: row.user_agent,
      platform: row.platform,
      language: row.language,
      hardwareConcurrency: row.hardware_concurrency,
      deviceMemory: row.device_memory,
    },
    canvas: {
      noiseLevel: row.canvas_noise_level,
      noiseSeed: row.canvas_noise_seed,
    },
    webgl: {
      vendor: row.webgl_vendor,
      renderer: row.webgl_renderer,
    },
    screen: {
      width: row.screen_width,
      height: row.screen_height,
      colorDepth: row.screen_color_depth,
      devicePixelRatio: row.device_pixel_ratio,
    },
    audio: {
      noiseEnabled: Boolean(row.audio_noise_enabled),
      noiseLevel: row.audio_noise_level,
    },
    timezone: {
      offset: row.timezone_offset,
      name: row.timezone_name,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const fingerprintStore = {
  getById(id) {
    const row = getDatabase().prepare('SELECT * FROM fingerprints WHERE id = ?').get(id);
    return mapRow(row);
  },

  create(data) {
    getDatabase().prepare(`
      INSERT INTO fingerprints (
        id, user_agent, platform, language, hardware_concurrency, device_memory,
        canvas_noise_level, canvas_noise_seed, webgl_vendor, webgl_renderer,
        screen_width, screen_height, screen_color_depth, device_pixel_ratio,
        audio_noise_enabled, audio_noise_level, timezone_offset, timezone_name
      ) VALUES (
        @id, @userAgent, @platform, @language, @hardwareConcurrency, @deviceMemory,
        @canvasNoiseLevel, @canvasNoiseSeed, @webglVendor, @webglRenderer,
        @screenWidth, @screenHeight, @screenColorDepth, @devicePixelRatio,
        @audioNoiseEnabled, @audioNoiseLevel, @timezoneOffset, @timezoneName
      )
    `).run({
      id: data.id,
      userAgent: data.navigator.userAgent,
      platform: data.navigator.platform,
      language: data.navigator.language,
      hardwareConcurrency: data.navigator.hardwareConcurrency,
      deviceMemory: data.navigator.deviceMemory,
      canvasNoiseLevel: data.canvas.noiseLevel,
      canvasNoiseSeed: data.canvas.noiseSeed,
      webglVendor: data.webgl.vendor,
      webglRenderer: data.webgl.renderer,
      screenWidth: data.screen.width,
      screenHeight: data.screen.height,
      screenColorDepth: data.screen.colorDepth,
      devicePixelRatio: data.screen.devicePixelRatio,
      audioNoiseEnabled: data.audio.noiseEnabled ? 1 : 0,
      audioNoiseLevel: data.audio.noiseLevel,
      timezoneOffset: data.timezone.offset,
      timezoneName: data.timezone.name,
    });
    return this.getById(data.id);
  },

  update(id, data) {
    getDatabase().prepare(`
      UPDATE fingerprints SET
        user_agent = @userAgent,
        platform = @platform,
        language = @language,
        hardware_concurrency = @hardwareConcurrency,
        device_memory = @deviceMemory,
        canvas_noise_level = @canvasNoiseLevel,
        canvas_noise_seed = @canvasNoiseSeed,
        webgl_vendor = @webglVendor,
        webgl_renderer = @webglRenderer,
        screen_width = @screenWidth,
        screen_height = @screenHeight,
        screen_color_depth = @screenColorDepth,
        device_pixel_ratio = @devicePixelRatio,
        audio_noise_enabled = @audioNoiseEnabled,
        audio_noise_level = @audioNoiseLevel,
        timezone_offset = @timezoneOffset,
        timezone_name = @timezoneName,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `).run({
      id,
      userAgent: data.navigator.userAgent,
      platform: data.navigator.platform,
      language: data.navigator.language,
      hardwareConcurrency: data.navigator.hardwareConcurrency,
      deviceMemory: data.navigator.deviceMemory,
      canvasNoiseLevel: data.canvas.noiseLevel,
      canvasNoiseSeed: data.canvas.noiseSeed,
      webglVendor: data.webgl.vendor,
      webglRenderer: data.webgl.renderer,
      screenWidth: data.screen.width,
      screenHeight: data.screen.height,
      screenColorDepth: data.screen.colorDepth,
      devicePixelRatio: data.screen.devicePixelRatio,
      audioNoiseEnabled: data.audio.noiseEnabled ? 1 : 0,
      audioNoiseLevel: data.audio.noiseLevel,
      timezoneOffset: data.timezone.offset,
      timezoneName: data.timezone.name,
    });
    return this.getById(id);
  },
};
