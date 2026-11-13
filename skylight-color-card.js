const COLOR_SWATCHES = [
  "#B7C5FF", "#C5D8FF", "#D1E8FF", "#E1F6FF", "#EFFFF6", "#E9FFE5", "#E8FFD1", "#E6FFC1", "#E3FF89", "#CFFF21",
  "#BAB7FF", "#C5C9FF", "#D1D8FF", "#E5ECFF", "#FFFFFF", "#FBFFEB", "#F9FFD5", "#FBFFC1", "#FCFF89", "#E7FF01",
  "#BBA3FF", "#CAC1FF", "#D8D1FF", "#EEE5FF", "#FFF3FC", "#FFF5EB", "#FFF9C9", "#FFF2C1", "#FFF189", "#FFFF00",
  "#CA8FFF", "#CDB7FF", "#DEC5FF", "#F2DDFF", "#FFE7F9", "#FFEDE2", "#FFEAC9", "#FFE4C1", "#FFE389", "#FFED01",
  "#D881FF", "#D5ABFF", "#E4BDFF", "#F5D1FF", "#FFD8FF", "#FFE1EB", "#FFD9D1", "#FFD5CD", "#FFD69F", "#FFD501",
  "#E164FF", "#E696FF", "#F5B4FF", "#FFC3FF", "#FFCDFF", "#FFD1F5", "#FFC9E3", "#FFC5D8", "#FFC6AF", "#FFC000",
];

const PRESET_ROWS = ["A", "B", "C", "D", "E", "F"];

// H-BAR-F spectrum profile decompiled from SL Control 1.1.41.
const H_BAR_F_SPECTRUM = {
  wavelengths: [447, 447, 447, 520, 520, 615, 650],
  amplitudes: [
    [20, 0, 0, 30, 0, 18, 0],
    [60, 0, 0, 10, 0, 18, 0],
    [0, 0, 0, 10, 0, 54, 12],
    [0, 0, 0, 30, 0, 18, 12],
  ],
  widths: [
    [25, 25, 25, 60, 60, 25, 60],
    [25, 25, 25, 60, 60, 25, 60],
    [25, 25, 25, 50, 60, 25, 60],
    [25, 25, 25, 50, 60, 25, 60],
  ],
};

function presetFromColorCode(value) {
  const code = Number(value);
  if (!Number.isInteger(code) || code < 0 || code >= 60) return null;
  return `${PRESET_ROWS[Math.floor(code / 10)]}${(code % 10) + 1}`;
}

class SkylightColorCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity || !config.power_entity) {
      throw new Error("Configure the preset select entity and power number entity.");
    }
    this.config = {
      name: "Color management",
      device_name: "H-BAR FM",
      mode_entity: null,
      ...config,
    };
    this._build();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    return 5;
  }

  _build() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.shadowRoot.replaceChildren();

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          overflow: hidden;
          border-radius: 0;
          background: #fff;
          color: #111;
          box-shadow: none;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-around;
          min-height: 58px;
          padding: 0 12px;
          color: white;
          background: #2196ed;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: .01em;
        }
        .title { flex: 1; text-align: center; }
        .device { flex: 1; text-align: center; white-space: nowrap; }
        .status { flex: 1; text-align: center; font-size: 12px; font-weight: 600; opacity: .95; }
        .content { padding: 34px 12px 0; }
        .section-title {
          margin: 0 0 8px;
          color: #596a7e;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .palette {
          display: grid;
          grid-template-columns: 22px repeat(10, minmax(0, 1fr));
          gap: 1px;
          align-items: stretch;
          user-select: none;
        }
        .axis, .row-label {
          display: grid;
          place-items: center;
          color: #999;
          font-size: 12px;
          font-weight: 500;
        }
        .swatch {
          position: relative;
          min-width: 0;
          aspect-ratio: 1;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: var(--swatch);
          cursor: pointer;
          transition: transform .12s ease, box-shadow .12s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .swatch:hover { z-index: 1; transform: scale(1.08); }
        .swatch:focus-visible { outline: 2px solid #178fe2; outline-offset: 2px; }
        .swatch[aria-pressed="true"] {
          z-index: 2;
          border: 2px solid #fff;
          outline: 3px solid #086fd1;
          outline-offset: 1px;
          box-shadow: inset 0 0 0 2px #14283d, 0 0 0 2px #fff, 0 2px 8px rgba(0, 0, 0, .38);
          transform: scale(1.06);
        }
        .swatch[aria-pressed="true"]::after {
          content: "✓";
          position: absolute;
          right: 2px;
          bottom: 2px;
          display: grid;
          place-items: center;
          width: clamp(12px, 3.8vw, 18px);
          height: clamp(12px, 3.8vw, 18px);
          border: 1px solid #fff;
          border-radius: 50%;
          color: #fff;
          background: #14283d;
          font-size: clamp(8px, 2.6vw, 12px);
          font-weight: 900;
          line-height: 1;
          box-shadow: 0 1px 3px rgba(0, 0, 0, .45);
        }
        .swatch::before { content: attr(data-marker); position: absolute; inset: 0; display: grid; place-items: center; color: var(--marker-color, #fff); font-size: clamp(10px, 3vw, 20px); font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,.12); pointer-events:none; }
        .swatch:not([data-marker=""]) { overflow: visible; }
        .intensity-title { margin: 30px 0 14px; text-align: center; font-size: 18px; font-weight: 600; }
        .intensity {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          align-items: center;
          gap: 8px;
          margin: 0 2px 38px;
        }
        .step {
          width: 38px;
          height: 38px;
          border: 2px solid #111;
          border-radius: 50%;
          color: #111;
          background: white;
          font-size: 27px;
          line-height: 1;
          cursor: pointer;
        }
        .range-wrap { min-width: 0; }
        .range-label { display: none; }
        input[type="range"] {
          display: block;
          width: 100%;
          height: 34px;
          margin: 0;
          accent-color: #188fe2;
          cursor: pointer;
          appearance: none;
          border: 2px solid #111;
          border-radius: 24px;
          background: linear-gradient(90deg,#111,#fff);
        }
        input[type="range"]::-webkit-slider-thumb { appearance:none; width:16px; height:42px; border:2px solid #111; border-radius:7px; background:linear-gradient(#fff,#a8b5c0); }
        .modebar { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin:0 -12px; background:#2196ed; }
        .mode { min-height:54px; padding:8px 3px; border:0; color:#eef7ff; background:transparent; font-size:16px; font-weight:400; cursor:pointer; }
        .mode:hover, .mode[aria-pressed="true"] { color:#9dff7f; background:transparent; font-weight:700; }
        .mode:disabled { opacity:.4; cursor:not-allowed; }
        .mode[data-mode="superior"], .mode[data-mode="demo"], .mode[data-mode="off"], .mode[data-mode="clone"] { grid-row:2; }
        .mode[data-mode="superior"] { grid-column:3; }
        .mode[data-mode="demo"] { grid-column:1; }
        .mode[data-mode="off"] { grid-column:2; }
        .mode[data-mode="clone"] { grid-column:3; }
        .app-modes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); margin:0 -12px; background:#2196ed; }
        .app-modes .mode { grid-row:auto!important; grid-column:auto!important; }
        .spectrum { margin: 0 8px 26px; }
        .spectrum[hidden] { display:none; }
        .spectrum svg { display:block; width:100%; height:auto; overflow:visible; }
        .error { padding: 18px; color: #a94442; font-size: 14px; }
        @media (max-width: 360px) {
          .content { padding: 14px 12px 12px; }
          .palette { grid-template-columns: 18px repeat(10, minmax(0, 1fr)); gap: 2px; }
          .axis, .row-label { font-size: 9px; }
        }
      </style>
      <ha-card>
          <div class="topbar"><span class="device"></span><span class="title"></span><span class="status"></span></div>
        <div class="content">
          <div class="section-title">Color palette</div>
          <div class="palette" role="grid" aria-label="Preset color selection"></div>
          <div class="intensity-title">Intensity: <span class="intensity-value-heading">30%</span></div>
          <div class="intensity">
            <button class="step decrease" type="button" aria-label="Decrease intensity">−</button>
            <div class="range-wrap">
              <div class="range-label"><span class="intensity-label">Manual power</span><span class="intensity-value">30%</span></div>
              <input class="range" type="range" min="1" max="100" step="1" aria-label="Lamp intensity">
            </div>
            <button class="step increase" type="button" aria-label="Increase intensity">+</button>
          </div>
          <div class="spectrum" hidden aria-label="H-BAR-F light spectrum">
            <svg class="spectrum-svg" viewBox="0 0 420 230" role="img" aria-label="Lamp spectrum from 400 to 700 nanometers"></svg>
          </div>
          <div class="app-modes" role="group" aria-label="Lamp mode">
            <button class="mode" type="button" data-mode="auto">Auto</button>
            <button class="mode" type="button" data-mode="manual">Manual</button>
            <button class="mode" type="button" data-mode="superior" disabled>Master</button>
            <button class="mode" type="button" data-mode="demo">Demo</button>
            <button class="mode" type="button" data-mode="off">Off</button>
            <button class="mode" type="button" data-mode="clone" disabled>Clone</button>
          </div>
        </div>
      </ha-card>
    `;

    this._palette = this.shadowRoot.querySelector(".palette");
    this._intensityInput = this.shadowRoot.querySelector(".range");
    this._intensityValue = this.shadowRoot.querySelector(".intensity-value");
    this._intensityHeading = this.shadowRoot.querySelector(".intensity-value-heading");
    this._intensityLabel = this.shadowRoot.querySelector(".intensity-label");
    this._modeEntityExplicit = Boolean(this.config.mode_entity);
    this.shadowRoot.querySelector(".title").textContent = this.config.name;
    this.shadowRoot.querySelector(".device").textContent = this.config.device_name;

    const blank = document.createElement("span");
    blank.className = "axis";
    blank.setAttribute("aria-hidden", "true");
    this._palette.appendChild(blank);
    for (let column = 1; column <= 10; column += 1) {
      const label = document.createElement("span");
      label.className = "axis";
      label.textContent = String(column);
      this._palette.appendChild(label);
    }

    const markers = { A4: ["▲", "#aaa"], A7: ["❧", "#75a976"], C1: ["☾", "#7580c8"], C5: ["♜", "#e9b83e"], D6: ["❧", "#79bf65"], E9: ["☼", "#e9d930"], F1: ["✿", "#d4779d"], F7: ["❧", "#b87878"] };
    PRESET_ROWS.forEach((row, rowIndex) => {
      const rowLabel = document.createElement("span");
      rowLabel.className = "row-label";
      rowLabel.textContent = row;
      this._palette.appendChild(rowLabel);

      for (let column = 1; column <= 10; column += 1) {
        const effect = `${row}${column}`;
        const colorIndex = rowIndex * 10 + column - 1;
        const button = document.createElement("button");
        button.className = "swatch";
        button.type = "button";
        button.dataset.effect = effect;
        button.dataset.marker = markers[effect]?.[0] || "";
        if (markers[effect]) button.style.setProperty("--marker-color", markers[effect][1]);
        button.style.setProperty("--swatch", COLOR_SWATCHES[colorIndex]);
        button.title = effect;
        button.setAttribute("role", "gridcell");
        button.setAttribute("aria-label", `Color ${effect}`);
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => this._selectEffect(effect));
        this._palette.appendChild(button);
      }
    });

    this.shadowRoot.querySelectorAll(".mode").forEach((button) => {
      button.addEventListener("click", () => this._selectMode(button.dataset.mode));
    });
    this.shadowRoot.querySelector(".decrease").addEventListener("click", () => this._changeIntensity(-5));
    this.shadowRoot.querySelector(".increase").addEventListener("click", () => this._changeIntensity(5));
    this._intensityInput.addEventListener("input", (event) => {
      this._intensityDragging = true;
      this._showIntensity(Number(event.target.value));
    });
    this._intensityInput.addEventListener("change", (event) => {
      this._intensityDragging = false;
      this._sendIntensity(Number(event.target.value));
    });
  }

  _update() {
    if (!this._hass || !this._palette) return;
    const state = this._hass.states[this.config.entity];
    if (!state) {
      this._showError(`Entity ${this.config.entity} was not found.`);
      return;
    }

    const attributes = state.attributes || {};
    const availableEffects = new Set(attributes.options || []);
    const objectId = this.config.entity.split(".")[1].replace(/_preset$/, "");
    const colorEntity = this.config.color_entity || `sensor.${objectId}_manual_color`;
    const colorState = this._hass.states[colorEntity];
    const reportedPreset = colorState ? presetFromColorCode(colorState.state) : null;
    const currentEffect = reportedPreset || state.state;
    const powerState = this._hass.states[this.config.power_entity];
    const percent = powerState ? Number(powerState.state) : 30;
    const modeEntity = this._findModeEntity();
    const modeState = modeEntity ? this._hass.states[modeEntity]?.state : null;
    const channelValues = [0, 1, 2, 3].map((channel) => {
      const channelState = this._hass.states[`sensor.${objectId}_pwm_channel_${channel}`];
      const value = channelState ? Number(channelState.state) : NaN;
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
    });

    this.shadowRoot.querySelector(".error")?.remove();
    this.shadowRoot.querySelector(".content").hidden = false;
    const activePreset = currentEffect;
    const presetLabel = reportedPreset
      ? `${modeState === "auto" ? "LAMP PRESET" : "PRESET"} ${reportedPreset}`
      : "PRESET —";
    const lastRead = colorState?.last_updated ? Date.parse(colorState.last_updated) : NaN;
    const ageMinutes = Number.isFinite(lastRead) ? Math.max(0, Math.floor((Date.now() - lastRead) / 60000)) : null;
    const staleLabel = ageMinutes == null
      ? ""
      : ageMinutes >= 1440
        ? ` · READ ${Math.floor(ageMinutes / 1440)} DAYS AGO`
        : ageMinutes >= 5
          ? ` · READ ${ageMinutes} MIN AGO`
          : "";
    const modeLabel = modeState === "manual"
      ? "MANUAL"
      : modeState === "auto"
        ? "AUTO · SCHEDULE"
        : modeState === "demo"
          ? "DEMO"
          : "OFF";
    const statusText = `${modeLabel} · ${presetLabel}${staleLabel}`;
    this.shadowRoot.querySelector(".status").textContent = statusText;
    this._intensityLabel.textContent = modeState === "manual"
      ? "Manual power"
      : "Manual power (setting)";
    if (!this._intensityDragging) this._showIntensity(percent);
    this._renderSpectrum(channelValues, percent);

    this._palette.querySelectorAll(".swatch").forEach((button) => {
      const supported = availableEffects.has(button.dataset.effect);
      button.disabled = !supported;
      button.setAttribute("aria-pressed", String(button.dataset.effect === activePreset));
    });

    const currentMode = modeState || "manual";
    this.shadowRoot.querySelectorAll(".mode").forEach((button) => {
      const supported = !["superior", "clone"].includes(button.dataset.mode);
      button.disabled = !modeEntity || !supported;
      button.setAttribute("aria-pressed", String(button.dataset.mode === currentMode));
      button.title = !supported
        ? "This mode is not supported by the integration yet."
        : button.disabled && !modeEntity
          ? "Set mode_entity in the card configuration to control this mode."
          : "";
    });
  }

  _showError(message) {
    const content = this.shadowRoot.querySelector(".content");
    content.hidden = true;
    let error = this.shadowRoot.querySelector(".error");
    if (!error) {
      error = document.createElement("div");
      error.className = "error";
      this.shadowRoot.querySelector("ha-card").appendChild(error);
    }
    error.textContent = message;
  }

  _findModeEntity() {
    if (this.config.mode_entity) return this.config.mode_entity;
    const objectId = this.config.entity.split(".")[1];
    const baseName = objectId.replace(/_preset$/, "");
    const candidate = `select.${baseName}_mode`;
    return this._hass.states[candidate] ? candidate : null;
  }

  _currentEffect() {
    const state = this._hass.states[this.config.entity];
    return state?.state || "A1";
  }

  _selectEffect(effect) {
    this._hass.callService("select", "select_option", {
      entity_id: this.config.entity,
      option: effect,
    });
  }

  _currentIntensity() {
    return Number(this._intensityInput.value || 30);
  }

  _showIntensity(value) {
    const percent = Math.max(1, Math.min(100, Math.round(value)));
    this._intensityInput.value = String(percent);
    this._intensityValue.textContent = `${percent}%`;
    this._intensityHeading.textContent = `${percent}%`;
  }

  _renderSpectrum(channels, intensity) {
    const container = this.shadowRoot.querySelector(".spectrum");
    if (channels.some((value) => value == null)) {
      container.hidden = true;
      return;
    }

    const svg = this.shadowRoot.querySelector(".spectrum-svg");
    const left = 44;
    const right = 408;
    const top = 12;
    const bottom = 177;
    const width = right - left;
    const height = bottom - top;
    const values = [];
    let maxValue = 0;

    for (let sample = 0; sample <= width; sample += 1) {
      const wavelength = 400 + (sample / width) * 300;
      let value = 0;
      for (let channel = 0; channel < 4; channel += 1) {
        for (let band = 0; band < 7; band += 1) {
          const amplitude = (channels[channel] / 100) * (H_BAR_F_SPECTRUM.amplitudes[channel][band] / 100);
          const spread = H_BAR_F_SPECTRUM.widths[channel][band] * 0.6017;
          const distance = wavelength - H_BAR_F_SPECTRUM.wavelengths[band];
          value += amplitude * Math.exp(-(distance * distance) / (spread * spread));
        }
      }
      values.push(value);
      if (value > maxValue) maxValue = value;
    }

    if (maxValue <= 0) {
      container.hidden = true;
      return;
    }

    const peakPercent = Math.max(0, Math.min(100, Number(intensity) || 0)) * 0.8;
    const points = values.map((value, index) => {
      const x = left + index;
      const y = bottom - (value / maxValue) * (peakPercent / 100) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    const area = `${points} L${right} ${bottom} L${left} ${bottom} Z`;
    const grid = [0, 25, 50, 75, 100].map((tick) => {
      const y = bottom - (tick / 100) * height;
      return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" class="grid"/><line x1="${left - 7}" y1="${y}" x2="${left}" y2="${y}" class="tick"/><text x="${left - 10}" y="${y + 4}" text-anchor="end">${tick}%</text>`;
    }).join("");
    const wavelengths = [400, 450, 500, 550, 600, 650, 700].map((tick) => {
      const x = left + ((tick - 400) / 300) * width;
      return `<line x1="${x}" y1="${bottom}" x2="${x}" y2="${bottom + 6}" class="tick"/><text x="${x}" y="${bottom + 24}" text-anchor="middle">${tick}</text>`;
    }).join("");

    svg.innerHTML = `<defs><linearGradient id="spectrum-fill" x1="0" x2="1"><stop offset="0%" stop-color="#5424a8"/><stop offset="17%" stop-color="#0877d1"/><stop offset="38%" stop-color="#00c7c7"/><stop offset="52%" stop-color="#19c856"/><stop offset="67%" stop-color="#e4d700"/><stop offset="82%" stop-color="#ff8a00"/><stop offset="100%" stop-color="#d60000"/></linearGradient></defs><g class="axes">${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" class="axis-line"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" class="axis-line"/>${wavelengths}<text x="${(left + right) / 2}" y="226" text-anchor="middle">Wavelength [nm]</text></g><path d="${area}" fill="url(#spectrum-fill)" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/>`;
    svg.querySelectorAll("text").forEach((node) => {
      node.setAttribute("font-size", "11");
      node.setAttribute("font-family", "Arial, sans-serif");
      node.setAttribute("fill", "currentColor");
    });
    svg.querySelectorAll(".grid").forEach((node) => {
      node.setAttribute("stroke", "#d3d3d3");
      node.setAttribute("stroke-width", "0.6");
    });
    svg.querySelectorAll(".tick").forEach((node) => {
      node.setAttribute("stroke", "#154cff");
      node.setAttribute("stroke-width", "1");
    });
    svg.querySelectorAll(".axis-line").forEach((node) => {
      node.setAttribute("stroke", "#154cff");
      node.setAttribute("stroke-width", "1.3");
    });
    container.hidden = false;
  }

  _changeIntensity(delta) {
    const next = Math.max(1, Math.min(100, this._currentIntensity() + delta));
    this._showIntensity(next);
    this._sendIntensity(next);
  }

  _sendIntensity(brightness) {
    const percent = Math.max(1, Math.min(100, Math.round(brightness)));
    this._hass.callService("number", "set_value", {
      entity_id: this.config.power_entity,
      // number.set_value validates this as a JSON number; passing a string
      // can be rejected by Home Assistant before the integration sees it.
      value: percent,
    });
  }

  _selectMode(mode) {
    if (mode === "manual") {
      if (this._findModeEntity()) {
        this._hass.callService("select", "select_option", {
          entity_id: this._findModeEntity(),
          option: "manual",
        });
      }
    } else if (mode === "off") {
      const modeEntity = this._findModeEntity();
      if (modeEntity) {
        this._hass.callService("select", "select_option", {
          entity_id: modeEntity,
          option: "off",
        });
      }
    } else {
      const modeEntity = this._findModeEntity();
      if (!modeEntity) return;
      this._hass.callService("select", "select_option", {
        entity_id: modeEntity,
        option: mode,
      });
    }
  }

}

if (!customElements.get("skylight-color-card-v4")) {
  customElements.define("skylight-color-card-v4", SkylightColorCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "skylight-color-card-v4",
  name: "Skylight color palette",
  description: "Color grid and intensity control for Skylight lamps",
  preview: true,
});
