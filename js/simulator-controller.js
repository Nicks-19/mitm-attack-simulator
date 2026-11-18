/**
 * Man-in-the-Middle (MITM) Attack Simulator
 * Main Simulator Controller & Interactive UI Orchestrator
 *
 * Links all simulation actions, button states, message transformation pipeline,
 * cryptographic operations, event logging, and state matrix synchronizations.
 */

class SimulatorController {
  constructor() {
    this.isSecureMode = false;
    this.soundEnabled = true;

    // Simulation Data Store
    this.originalMessage = "";
    this.encryptedPackage = null;
    this.interceptedPayload = null;
    this.modifiedPayload = null;
    this.receivedPayload = null;
    this.isTampered = false;
    this.tamperType = "none";
    this.eveHasRead = false;

    // Event Log Counter
    this.logCounter = 0;
    this.logs = [];

    // Audio Context (initialized on user gesture)
    this.audioCtx = null;
  }

  /**
   * Initialize DOM elements and event bindings
   */
  async init() {
    // 1. Initialize Cryptographic Engine
    await window.cryptoManager.initializeKey();
    this.updateCryptoInspectorKey();

    // 2. Initialize Animation Engine
    window.networkAnimationEngine.init();

    // 3. Subscribe State Machine to UI updates
    window.communicationStateMachine.subscribe(summary => {
      this.renderStateMatrix(summary);
      this.updateHudMetrics(summary);
    });

    // 4. Bind interactive events
    this.bindEvents();

    // 5. Initial reset to pristine state
    this.resetSimulation();

    this.log('INFO', 'Simulator initialized. Cryptographic key pair generated (AES-GCM 256-bit). Ready for transmission.');
  }

  /**
   * Bind event listeners for UI buttons and inputs
   */
  bindEvents() {
    // Mode Switch (Secure AES-GCM vs Plaintext)
    const secureModeToggle = document.getElementById('secureModeToggle');
    if (secureModeToggle) {
      secureModeToggle.addEventListener('change', (e) => {
        this.setSecureMode(e.target.checked);
      });
    }

    // Alice Preset Selector
    const presetSelect = document.getElementById('aliceMessagePreset');
    const aliceInput = document.getElementById('aliceMessageInput');
    if (presetSelect && aliceInput) {
      presetSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'custom') {
          aliceInput.value = e.target.value;
        }
      });
    }

    // Action Buttons
    const btnSend = document.getElementById('btnSendMessage');
    const btnIntercept = document.getElementById('btnInterceptMessage');
    const btnRead = document.getElementById('btnReadMessage');
    const btnModify = document.getElementById('btnModifyMessage');
    const btnForward = document.getElementById('btnForwardMessage');
    const btnReset = document.getElementById('btnResetSimulation');
    const btnMute = document.getElementById('btnToggleSound');

    if (btnSend) btnSend.addEventListener('click', () => this.handleSendMessage());
    if (btnIntercept) btnIntercept.addEventListener('click', () => this.handleInterceptMessage());
    if (btnRead) btnRead.addEventListener('click', () => this.handleReadMessage());
    if (btnModify) btnModify.addEventListener('click', () => this.handleModifyMessage());
    if (btnForward) btnForward.addEventListener('click', () => this.handleForwardMessage());
    if (btnReset) btnReset.addEventListener('click', () => this.resetSimulation());

    if (btnMute) {
      btnMute.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        btnMute.innerHTML = this.soundEnabled
          ? `<i class="bi bi-volume-up-fill"></i> Sound: ON`
          : `<i class="bi bi-volume-mute-fill"></i> Sound: OFF`;
      });
    }

    // Eve Quick Tamper Buttons (Plaintext)
    document.querySelectorAll('.btn-quick-tamper-plain').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.target.getAttribute('data-tamper-text') || e.target.innerText;
        const eveInput = document.getElementById('eveModifiedInput');
        if (eveInput) {
          eveInput.value = text;
          this.handleModifyMessage();
        }
      });
    });

    // Eve Quick Tamper Buttons (Ciphertext)
    const btnFlipBit = document.getElementById('btnTamperFlipBit');
    const btnCorruptTag = document.getElementById('btnTamperCorruptTag');
    const btnGarbageBytes = document.getElementById('btnTamperGarbageBytes');

    if (btnFlipBit) {
      btnFlipBit.addEventListener('click', () => this.handleTamperCiphertext('flip_bit'));
    }
    if (btnCorruptTag) {
      btnCorruptTag.addEventListener('click', () => this.handleTamperCiphertext('corrupt_tag'));
    }
    if (btnGarbageBytes) {
      btnGarbageBytes.addEventListener('click', () => this.handleTamperCiphertext('garbage'));
    }

    // Log Controls
    const btnClearLogs = document.getElementById('btnClearLogs');
    const btnCopyLogs = document.getElementById('btnCopyLogs');
    if (btnClearLogs) btnClearLogs.addEventListener('click', () => this.clearLogs());
    if (btnCopyLogs) btnCopyLogs.addEventListener('click', () => this.copyLogsToClipboard());
  }

  /**
   * Toggle Secure Mode (AES-GCM Authenticated Encryption)
   */
  async setSecureMode(enabled) {
    this.isSecureMode = enabled;
    const badge = document.getElementById('globalSecurityBadge');
    const hudSecurity = document.getElementById('hudChannelSecurity');
    const evePlainCard = document.getElementById('evePlaintextTamperCard');
    const eveSecureCard = document.getElementById('eveCiphertextTamperCard');

    if (enabled) {
      if (badge) {
        badge.className = 'badge bg-success-glow';
        badge.innerHTML = `<i class="bi bi-shield-lock-fill"></i> AES-GCM-256 (SECURE)`;
      }
      if (hudSecurity) {
        hudSecurity.innerHTML = `<span class="text-success"><i class="bi bi-shield-check"></i> AES-GCM-256</span>`;
      }
      if (evePlainCard) evePlainCard.style.display = 'none';
      if (eveSecureCard) eveSecureCard.style.display = 'block';

      this.log('CRYPTO', 'Secure Communication Mode ENABLED: Galois/Counter Mode (AES-GCM-256) with 128-bit authentication tag.');
    } else {
      if (badge) {
        badge.className = 'badge bg-danger-glow';
        badge.innerHTML = `<i class="bi bi-shield-slash-fill"></i> INSECURE (PLAINTEXT)`;
      }
      if (hudSecurity) {
        hudSecurity.innerHTML = `<span class="text-danger"><i class="bi bi-shield-x"></i> Plaintext HTTP</span>`;
      }
      if (evePlainCard) evePlainCard.style.display = 'block';
      if (eveSecureCard) eveSecureCard.style.display = 'none';

      this.log('INFO', 'Secure Communication Mode DISABLED: Messages will transmit in unauthenticated plaintext.');
    }

    // If packet is currently in flight or reset, update states
    if (window.communicationStateMachine.currentStageId !== 'initial') {
      this.resetSimulation();
    }
  }

  /**
   * STEP 1: Alice sends message
   */
  async handleSendMessage() {
    const inputEl = document.getElementById('aliceMessageInput');
    const message = inputEl ? inputEl.value.trim() : "";

    if (!message) {
      alert("Please enter a message to send.");
      return;
    }

    this.playTone(440, 'sine', 0.15);
    this.originalMessage = message;
    this.isTampered = false;
    this.tamperType = "none";
    this.eveHasRead = false;

    // Prepare packet based on mode
    if (this.isSecureMode) {
      this.encryptedPackage = await window.cryptoManager.encrypt(message);
      this.interceptedPayload = {
        isEncrypted: true,
        ivHex: this.encryptedPackage.ivHex,
        ciphertextHex: this.encryptedPackage.ciphertextHex,
        tagHex: this.encryptedPackage.tagHex,
        fullPayloadHex: this.encryptedPackage.fullPayloadHex,
        fullPayload: new Uint8Array(this.encryptedPackage.fullPayload),
        iv: new Uint8Array(this.encryptedPackage.iv),
        plaintext: message
      };
      this.modifiedPayload = { ...this.interceptedPayload };
      this.updateCryptoInspectorPacket(this.encryptedPackage);

      this.log('TRANSMIT', `Alice transmitted AES-GCM encrypted packet [IV: ${this.encryptedPackage.ivHex.slice(0, 8)}... | Tag: ${this.encryptedPackage.tagHex.slice(0, 8)}...]`);
    } else {
      this.interceptedPayload = {
        isEncrypted: false,
        plaintext: message
      };
      this.modifiedPayload = { ...this.interceptedPayload };
      this.log('TRANSMIT', `Alice transmitted plaintext packet: "${message}"`);
    }

    // Update Transformations
    this.updateTransformationDisplay('original', message);
    this.updateTransformationDisplay('intercepted', 'In Transit...');
    this.updateTransformationDisplay('modified', '—');
    this.updateTransformationDisplay('received', '—');

    // Update State Machine
    window.communicationStateMachine.transitionTo('sent', {
      payload: this.isSecureMode ? `[AES-GCM] ${this.encryptedPackage.ciphertextHex.slice(0, 24)}...` : message,
      note: `Alice dispatched ${this.isSecureMode ? 'authenticated ciphertext' : 'plaintext'} packet.`
    });

    // Update Button States
    this.updateButtonStates({ send: false, intercept: true, read: false, modify: false, forward: false });

    // Animate Packet from Alice to Eve
    window.networkAnimationEngine.animateAliceToEve(this.isSecureMode, () => {
      this.log('INFO', 'Packet arrived at Eve\'s network tap point. Interception ready.');
    });
  }

  /**
   * STEP 2: Eve intercepts message
   */
  handleInterceptMessage() {
    this.playTone(320, 'square', 0.2);

    window.communicationStateMachine.transitionTo('intercepted', {
      payload: this.isSecureMode ? `[ENCRYPTED] ${this.encryptedPackage.ciphertextHex.slice(0, 24)}...` : this.originalMessage,
      note: 'Eve captured packet using ARP spoofing / wiretap proxy.'
    });

    this.log('INTERCEPT', `Eve intercepted packet mid-flight! Payload buffered in Eve's memory.`);

    // Update Eve Console UI
    const eveBufferBox = document.getElementById('eveInterceptedBuffer');
    if (eveBufferBox) {
      if (this.isSecureMode) {
        eveBufferBox.innerHTML = `
          <div class="crypto-meta-tag"><span class="badge bg-purple">AES-GCM CIPHERTEXT</span> <span>IV: ${this.interceptedPayload.ivHex}</span></div>
          <div class="payload-hex-preview">${window.cryptoManager.formatHexSpaces(this.interceptedPayload.fullPayloadHex)}</div>
        `;
      } else {
        eveBufferBox.innerHTML = `<div class="payload-plain-preview"><code>${this.escapeHtml(this.originalMessage)}</code></div>`;
      }
    }

    // Update Transformation View
    this.updateTransformationDisplay('intercepted', this.isSecureMode
      ? `[AES-GCM] IV=${this.interceptedPayload.ivHex.slice(0, 8)}... Cipher=${this.interceptedPayload.ciphertextHex.slice(0, 16)}...`
      : this.originalMessage
    );

    // Update Buttons
    this.updateButtonStates({ send: false, intercept: false, read: true, modify: false, forward: true });
  }

  /**
   * STEP 3: Eve reads / inspects message
   */
  handleReadMessage() {
    this.playTone(550, 'sine', 0.15);
    this.eveHasRead = true;

    window.communicationStateMachine.transitionTo('read', {
      payload: this.isSecureMode ? 'Ciphertext (Unreadable without key)' : this.originalMessage,
      note: this.isSecureMode
        ? 'Eve inspected packet: High-entropy ciphertext. Confidentiality holds.'
        : 'Eve read plaintext message: Confidentiality breached!'
    });

    const eveReadModalBody = document.getElementById('eveReadInspectionContent');
    if (eveReadModalBody) {
      if (this.isSecureMode) {
        eveReadModalBody.innerHTML = `
          <div class="alert alert-warning mb-3">
            <i class="bi bi-shield-lock"></i> <strong>CONFIDENTIALITY PRESERVED:</strong>
            The message is encrypted with AES-256-GCM. Eve does not possess the symmetric key,
            so the plaintext cannot be decoded. Eve only sees cryptographic pseudo-random bits.
          </div>
          <div class="crypto-inspect-grid">
            <div><label class="text-info">IV (Initialization Vector - 12 bytes):</label><pre>${this.interceptedPayload.ivHex}</pre></div>
            <div><label class="text-purple">Ciphertext Payload:</label><pre>${window.cryptoManager.formatHexSpaces(this.interceptedPayload.ciphertextHex)}</pre></div>
            <div><label class="text-danger">GMAC Authentication Tag (16 bytes):</label><pre>${this.interceptedPayload.tagHex}</pre></div>
          </div>
        `;
        this.log('READ', `Eve inspected packet: AES-GCM-256 encrypted. Plaintext unreadable to adversary.`);
      } else {
        eveReadModalBody.innerHTML = `
          <div class="alert alert-danger mb-3">
            <i class="bi bi-exclamation-triangle-fill"></i> <strong>CONFIDENTIALITY BREACHED:</strong>
            Because the transmission was unencrypted plaintext HTTP, Eve can view the message exactly as Alice typed it!
          </div>
          <div class="p-3 bg-darker rounded border border-danger">
            <h6 class="text-muted mb-1">Decoded Payload:</h6>
            <h4 class="text-danger mb-0 font-monospace">${this.escapeHtml(this.originalMessage)}</h4>
          </div>
        `;
        this.log('READ', `Eve read plaintext payload: "${this.originalMessage}". Confidentiality completely breached.`);
      }
    }

    // Show Eve Read Inspection Card
    const inspectionCard = document.getElementById('eveInspectionCard');
    if (inspectionCard) inspectionCard.style.display = 'block';

    // Populate modified input default
    const eveInput = document.getElementById('eveModifiedInput');
    if (eveInput && !this.isSecureMode) {
      eveInput.value = this.originalMessage;
    }

    // Enable Modify and Forward
    this.updateButtonStates({ send: false, intercept: false, read: false, modify: true, forward: true });
  }

  /**
   * STEP 4A: Eve modifies message (Plaintext mode)
   */
  handleModifyMessage() {
    if (this.isSecureMode) {
      // In secure mode, tampering is handled via byte flip buttons
      return;
    }

    const eveInput = document.getElementById('eveModifiedInput');
    const newText = eveInput ? eveInput.value : "";

    if (!newText) {
      alert("Please enter replacement text or leave original.");
      return;
    }

    this.playTone(260, 'sawtooth', 0.25);
    this.isTampered = (newText !== this.originalMessage);
    this.tamperType = this.isTampered ? "plaintext_tamper" : "none";
    this.modifiedPayload = {
      isEncrypted: false,
      plaintext: newText
    };

    window.communicationStateMachine.transitionTo('modified', {
      payload: newText,
      isTampered: this.isTampered,
      note: this.isTampered ? `Eve modified payload: "${newText}"` : 'Eve left message unchanged.'
    });

    if (this.isTampered) {
      this.log('TAMPER', `Eve modified payload from "${this.originalMessage}" to "${newText}". Integrity compromised!`);
    } else {
      this.log('INFO', `Eve decided NOT to modify payload. Original message maintained.`);
    }

    this.updateTransformationDisplay('modified', newText, this.isTampered);
  }

  /**
   * STEP 4B: Eve tampers with Ciphertext / Auth Tag (Secure mode)
   */
  handleTamperCiphertext(type) {
    if (!this.isSecureMode || !this.interceptedPayload) return;

    this.playTone(200, 'sawtooth', 0.3);
    this.isTampered = true;
    this.tamperType = type;

    const originalBytes = new Uint8Array(this.interceptedPayload.fullPayload);
    let tamperedBytes = new Uint8Array(originalBytes);

    if (type === 'flip_bit') {
      // Flip bit at index 0 (inside ciphertext)
      tamperedBytes = window.cryptoManager.tamperBytes(tamperedBytes, 0, 0x01);
      this.log('TAMPER', `Eve flipped bit 0x01 in ciphertext byte #0. Mathematical integrity is broken!`);
    } else if (type === 'corrupt_tag') {
      // Corrupt byte in authentication tag (last 16 bytes)
      const tagIndex = tamperedBytes.length - 1;
      tamperedBytes = window.cryptoManager.tamperBytes(tamperedBytes, tagIndex, 0xFF);
      this.log('TAMPER', `Eve altered authentication tag byte at index #${tagIndex}. Auth tag corrupted!`);
    } else if (type === 'garbage') {
      // Inject random garbage
      tamperedBytes = new Uint8Array(originalBytes.length + 8);
      tamperedBytes.set(originalBytes);
      window.crypto.getRandomValues(tamperedBytes.subarray(originalBytes.length));
      this.log('TAMPER', `Eve injected 8 random garbage bytes into the encrypted stream.`);
    }

    this.modifiedPayload = {
      ...this.interceptedPayload,
      fullPayload: tamperedBytes,
      fullPayloadHex: window.cryptoManager.bytesToHex(tamperedBytes)
    };

    window.communicationStateMachine.transitionTo('modified', {
      payload: `[TAMPERED] ${this.modifiedPayload.fullPayloadHex.slice(0, 24)}...`,
      isTampered: true,
      note: `Eve tampered with encrypted payload (${type}). Tag validation will fail at Bob!`
    });

    this.updateTransformationDisplay('modified', `[TAMPERED] ${this.modifiedPayload.fullPayloadHex.slice(0, 24)}...`, true);

    const statusBadge = document.getElementById('eveTamperStatusBadge');
    if (statusBadge) {
      statusBadge.className = 'badge bg-danger';
      statusBadge.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Ciphertext Tampered (${type})`;
    }
  }

  /**
   * STEP 5: Eve forwards message to Bob
   */
  handleForwardMessage() {
    this.playTone(480, 'sine', 0.15);

    const payloadPreview = this.isSecureMode
      ? `[ENCRYPTED] ${this.modifiedPayload.fullPayloadHex.slice(0, 20)}...`
      : this.modifiedPayload.plaintext;

    window.communicationStateMachine.transitionTo('forwarded', {
      payload: payloadPreview,
      isTampered: this.isTampered,
      note: 'Eve forwarded packet downstream to Bob.'
    });

    this.log('FORWARD', `Eve forwarded ${this.isTampered ? 'tampered' : 'untampered'} packet to Bob.`);

    // Disable Eve buttons
    this.updateButtonStates({ send: false, intercept: false, read: false, modify: false, forward: false });

    // Animate Packet from Eve to Bob
    window.networkAnimationEngine.animateEveToBob(this.isTampered, this.isSecureMode, async () => {
      await this.handleBobReceiveMessage();
    });
  }

  /**
   * STEP 6: Bob receives and verifies message
   */
  async handleBobReceiveMessage() {
    const bobOutputBox = document.getElementById('bobReceivedMessageOutput');
    const bobMetaBox = document.getElementById('bobSecurityReportBox');

    if (this.isSecureMode) {
      // Bob invokes Web Crypto API AES-GCM Decryption and Tag Verification
      const decryptResult = await window.cryptoManager.decrypt(
        this.modifiedPayload.fullPayload,
        this.modifiedPayload.iv
      );

      if (decryptResult.success && decryptResult.verified) {
        // Tag Valid, Untampered
        this.playTone(880, 'sine', 0.3);
        this.log('AUTH_PASS', `Bob verified AES-GCM tag in ${decryptResult.durationMs}ms: AUTHENTIC! Decrypted plaintext: "${decryptResult.plaintext}"`);

        window.networkAnimationEngine.triggerBobVerification(true, false);

        if (bobOutputBox) {
          bobOutputBox.innerHTML = `
            <div class="alert alert-success">
              <h5 class="alert-heading"><i class="bi bi-check-circle-fill"></i> Decrypted Authentic Message:</h5>
              <div class="display-message-text text-success font-monospace">${this.escapeHtml(decryptResult.plaintext)}</div>
            </div>
          `;
        }

        if (bobMetaBox) {
          bobMetaBox.innerHTML = `
            <div class="verification-card border-success">
              <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-success"><i class="bi bi-shield-fill-check"></i> AES-GCM AUTHENTICATION PASSED</span>
                <span class="text-muted small">Verification Time: ${decryptResult.durationMs}ms</span>
              </div>
              <p class="small text-muted mb-1">
                <strong>Cryptographic Integrity Guaranteed:</strong> The 128-bit Galois Message Authentication Code (GMAC)
                matched the ciphertext. Web Crypto API verified that not a single bit was altered in transit.
              </p>
            </div>
          `;
        }

        this.updateTransformationDisplay('received', decryptResult.plaintext, false, true);

        window.communicationStateMachine.transitionTo('received', {
          payload: decryptResult.plaintext,
          isTampered: false,
          authStatus: 'VERIFIED_AUTHENTIC',
          note: 'Bob successfully verified GMAC tag and decrypted authentic message.'
        });
      } else {
        // Tag Invalid, Tampering Detected
        this.playTone(180, 'sawtooth', 0.5);
        this.log('AUTH_FAIL', `Bob's Web Crypto verification REJECTED packet: ${decryptResult.errorMessage}`);

        window.networkAnimationEngine.triggerBobVerification(false, false);

        if (bobOutputBox) {
          bobOutputBox.innerHTML = `
            <div class="alert alert-danger">
              <h5 class="alert-heading"><i class="bi bi-shield-fill-x"></i> AUTHENTICATION VERIFICATION FAILED!</h5>
              <p class="mb-1 font-monospace text-danger">OperationError: Ciphertext integrity tag mismatch. The packet has been modified in transit by an unauthorized party.</p>
              <div class="badge bg-danger p-2 mt-2">PAYLOAD REJECTED BY BOB - ZERO DATA ACCEPTED</div>
            </div>
          `;
        }

        if (bobMetaBox) {
          bobMetaBox.innerHTML = `
            <div class="verification-card border-danger">
              <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-danger"><i class="bi bi-exclamation-triangle-fill"></i> INTEGRITY COMPROMISED</span>
                <span class="text-danger small">Status: DECRYPTION REJECTED</span>
              </div>
              <p class="small text-danger mb-0">
                <strong>AES-GCM Security Protection:</strong> The Galois Field GMAC computation failed.
                Because AES-GCM guarantees both confidentiality and ciphertext integrity, any modification
                (even flipping a single bit) causes the Web Crypto API to strictly abort decryption.
              </p>
            </div>
          `;
        }

        this.updateTransformationDisplay('received', '[REJECTED - AUTHENTICATION FAILED]', true, false);

        window.communicationStateMachine.transitionTo('received', {
          payload: '[REJECTED: AUTH TAG MISMATCH]',
          isTampered: true,
          authStatus: 'INTEGRITY_FAIL',
          note: 'Bob detected unauthorized tampering! Packet rejected.'
        });
      }
    } else {
      // Insecure Plaintext Mode
      const finalPlaintext = this.modifiedPayload.plaintext;
      const wasModified = this.isTampered;

      if (wasModified) {
        this.playTone(300, 'square', 0.3);
        this.log('SECURITY_ALERT', `Bob received TAMPERED plaintext: "${finalPlaintext}". Bob has NO WAY to know message was altered!`);
      } else {
        this.playTone(600, 'sine', 0.2);
        this.log('INFO', `Bob received original plaintext: "${finalPlaintext}"`);
      }

      window.networkAnimationEngine.triggerBobVerification(false, true);

      if (bobOutputBox) {
        bobOutputBox.innerHTML = `
          <div class="alert ${wasModified ? 'alert-warning' : 'alert-info'}">
            <h5 class="alert-heading">
              <i class="bi ${wasModified ? 'bi-exclamation-circle-fill text-warning' : 'bi-info-circle-fill text-info'}"></i>
              Received Message:
            </h5>
            <div class="display-message-text font-monospace ${wasModified ? 'text-warning' : 'text-light'}">
              ${this.escapeHtml(finalPlaintext)}
            </div>
          </div>
        `;
      }

      if (bobMetaBox) {
        bobMetaBox.innerHTML = `
          <div class="verification-card border-warning">
            <div class="d-flex justify-content-between mb-2">
              <span class="badge bg-warning text-dark"><i class="bi bi-shield-slash"></i> NO AUTHENTICATION / NO INTEGRITY CHECK</span>
              <span class="text-warning small">${wasModified ? 'PAYLOAD WAS ALTERED' : 'PAYLOAD UNMODIFIED'}</span>
            </div>
            <p class="small text-muted mb-0">
              ${wasModified
                ? '<span class="text-warning"><strong>MITM ATTACK SUCCEEDED:</strong> Bob received the falsified message thinking it came directly from Alice. Plaintext HTTP provides zero authenticity.</span>'
                : 'Message arrived unmodified, but without cryptographic signatures, Bob cannot prove authenticity.'}
            </p>
          </div>
        `;
      }

      this.updateTransformationDisplay('received', finalPlaintext, wasModified, false);

      window.communicationStateMachine.transitionTo('received', {
        payload: finalPlaintext,
        isTampered: wasModified,
        authStatus: 'NO_AUTHENTICATION',
        note: wasModified
          ? 'Bob received tampered message unaware of MITM interception!'
          : 'Bob received original message, but lacks integrity proof.'
      });
    }

    // Allow new transmission or reset
    this.updateButtonStates({ send: true, intercept: false, read: false, modify: false, forward: false });
  }

  /**
   * Reset the entire simulation back to Initial State
   */
  resetSimulation() {
    this.playTone(350, 'sine', 0.1);

    this.originalMessage = "";
    this.encryptedPackage = null;
    this.interceptedPayload = null;
    this.modifiedPayload = null;
    this.receivedPayload = null;
    this.isTampered = false;
    this.tamperType = "none";
    this.eveHasRead = false;

    // Reset Animation
    window.networkAnimationEngine.reset();

    // Reset State Machine
    window.communicationStateMachine.reset();

    // Reset UI Fields
    const eveBufferBox = document.getElementById('eveInterceptedBuffer');
    const eveModifiedInput = document.getElementById('eveModifiedInput');
    const eveInspectionCard = document.getElementById('eveInspectionCard');
    const eveTamperStatusBadge = document.getElementById('eveTamperStatusBadge');
    const bobOutputBox = document.getElementById('bobReceivedMessageOutput');
    const bobMetaBox = document.getElementById('bobSecurityReportBox');

    if (eveBufferBox) eveBufferBox.innerHTML = '<span class="text-muted">Awaiting intercepted packet...</span>';
    if (eveModifiedInput) eveModifiedInput.value = '';
    if (eveInspectionCard) eveInspectionCard.style.display = 'none';
    if (eveTamperStatusBadge) {
      eveTamperStatusBadge.className = 'badge bg-secondary';
      eveTamperStatusBadge.innerHTML = 'Idle';
    }

    if (bobOutputBox) bobOutputBox.innerHTML = '<span class="text-muted">Awaiting incoming transmission from channel...</span>';
    if (bobMetaBox) bobMetaBox.innerHTML = '<span class="text-muted small">Integrity verification awaiting incoming packet.</span>';

    // Reset Transformations
    this.updateTransformationDisplay('original', '—');
    this.updateTransformationDisplay('intercepted', '—');
    this.updateTransformationDisplay('modified', '—');
    this.updateTransformationDisplay('received', '—');

    // Reset Buttons
    this.updateButtonStates({ send: true, intercept: false, read: false, modify: false, forward: false });

    this.log('INFO', 'Simulation reset to Initial State. All buffers, indicators, and state matrices cleared.');
  }

  /**
   * Update button disabled/enabled states
   */
  updateButtonStates(states) {
    const btnSend = document.getElementById('btnSendMessage');
    const btnIntercept = document.getElementById('btnInterceptMessage');
    const btnRead = document.getElementById('btnReadMessage');
    const btnModify = document.getElementById('btnModifyMessage');
    const btnForward = document.getElementById('btnForwardMessage');

    if (btnSend && states.send !== undefined) btnSend.disabled = !states.send;
    if (btnIntercept && states.intercept !== undefined) btnIntercept.disabled = !states.intercept;
    if (btnRead && states.read !== undefined) btnRead.disabled = !states.read;
    if (btnModify && states.modify !== undefined) btnModify.disabled = !states.modify;
    if (btnForward && states.forward !== undefined) btnForward.disabled = !states.forward;
  }

  /**
   * Update Step-by-Step Message Transformation Display
   */
  updateTransformationDisplay(stage, text, isTampered = false, isVerified = false) {
    const map = {
      original: 'transformOriginalMsg',
      intercepted: 'transformInterceptedMsg',
      modified: 'transformModifiedMsg',
      received: 'transformReceivedMsg'
    };

    const el = document.getElementById(map[stage]);
    if (!el) return;

    if (text === '—' || !text) {
      el.innerHTML = '<span class="text-muted">—</span>';
      el.className = 'transform-content text-muted';
      return;
    }

    let badgeClass = 'text-light';
    if (isTampered) badgeClass = 'text-danger fw-bold';
    else if (isVerified) badgeClass = 'text-success fw-bold';

    el.className = `transform-content ${badgeClass}`;
    el.innerHTML = `<code>${this.escapeHtml(text)}</code>`;
  }

  /**
   * Render Communication State Matrix Table
   */
  renderStateMatrix(summary) {
    const tbody = document.getElementById('stateMatrixTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    summary.stages.forEach(stage => {
      const tr = document.createElement('tr');
      const isCurrent = stage.id === summary.currentStageId;
      if (isCurrent) {
        tr.className = 'state-row-active';
      }

      let statusBadge = `<span class="badge bg-secondary">Pending</span>`;
      if (stage.stateData.status === 'active') {
        statusBadge = `<span class="badge bg-primary-pulse"><i class="bi bi-circle-fill me-1"></i> ACTIVE</span>`;
      } else if (stage.stateData.status === 'completed') {
        statusBadge = `<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i> DONE</span>`;
      }

      tr.innerHTML = `
        <td class="text-center font-monospace">${stage.number}</td>
        <td>
          <div class="fw-bold ${isCurrent ? 'text-cyan' : 'text-light'}">${stage.title}</div>
          <div class="small text-muted">${stage.actorRole}</div>
        </td>
        <td><span class="badge bg-actor-${stage.actor.toLowerCase().replace(/[^a-z]/g, '')}">${stage.actor}</span></td>
        <td>${statusBadge}</td>
        <td class="font-monospace small text-truncate" style="max-width: 220px;" title="${this.escapeHtml(stage.stateData.payloadSnapshot)}">
          ${this.escapeHtml(stage.stateData.payloadSnapshot)}
        </td>
        <td class="small text-muted">${stage.stateData.timestamp || '—'}</td>
        <td class="small text-muted">${this.escapeHtml(stage.stateData.securityNote)}</td>
      `;

      tbody.appendChild(tr);
    });

    // Update active stage tracker pill
    const activeStagePill = document.getElementById('activeStageNamePill');
    if (activeStagePill && summary.currentStageInfo) {
      activeStagePill.innerHTML = `Stage ${summary.currentStageInfo.number}: ${summary.currentStageInfo.title}`;
    }
  }

  /**
   * Update HUD Metric Cards
   */
  updateHudMetrics(summary) {
    const hudAttack = document.getElementById('hudAttackStatus');
    const hudIntegrity = document.getElementById('hudPayloadIntegrity');
    const hudConfidentiality = document.getElementById('hudConfidentiality');

    if (!hudAttack || !hudIntegrity || !hudConfidentiality) return;

    // Attack Status
    const stageId = summary.currentStageId;
    if (stageId === 'initial') {
      hudAttack.innerHTML = '<span class="text-muted"><i class="bi bi-pause-circle"></i> IDLE</span>';
    } else if (stageId === 'sent') {
      hudAttack.innerHTML = '<span class="text-info"><i class="bi bi-send"></i> IN_TRANSIT</span>';
    } else if (stageId === 'intercepted' || stageId === 'read') {
      hudAttack.innerHTML = '<span class="text-warning"><i class="bi bi-eye"></i> INTERCEPTED</span>';
    } else if (stageId === 'modified') {
      hudAttack.innerHTML = this.isTampered
        ? '<span class="text-danger"><i class="bi bi-pencil-square"></i> MODIFIED</span>'
        : '<span class="text-info"><i class="bi bi-check2"></i> UNMODIFIED</span>';
    } else if (stageId === 'forwarded' || stageId === 'received') {
      hudAttack.innerHTML = '<span class="text-purple"><i class="bi bi-arrow-right-circle"></i> FORWARDED</span>';
    }

    // Integrity Status
    if (stageId === 'initial' || stageId === 'sent' || stageId === 'intercepted') {
      hudIntegrity.innerHTML = '<span class="text-muted">UNCHECKED</span>';
    } else if (this.isTampered) {
      hudIntegrity.innerHTML = '<span class="text-danger"><i class="bi bi-shield-x"></i> COMPROMISED</span>';
    } else {
      hudIntegrity.innerHTML = '<span class="text-success"><i class="bi bi-shield-check"></i> INTACT</span>';
    }

    // Confidentiality Status
    if (!this.isSecureMode) {
      hudConfidentiality.innerHTML = '<span class="text-danger"><i class="bi bi-unlock"></i> EXPOSED (PLAINTEXT)</span>';
    } else {
      hudConfidentiality.innerHTML = '<span class="text-success"><i class="bi bi-lock"></i> ENCRYPTED (AES-GCM)</span>';
    }
  }

  /**
   * Log an event to the Communication Activity Log
   */
  log(level, message) {
    this.logCounter++;
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const logEntry = {
      id: this.logCounter,
      time: timeStr,
      level: level,
      message: message
    };

    this.logs.unshift(logEntry);
    this.renderLogEntry(logEntry);
  }

  /**
   * Render single log entry in the activity log container
   */
  renderLogEntry(entry) {
    const container = document.getElementById('activityLogContainer');
    if (!container) return;

    const levelClasses = {
      INFO: 'log-info',
      TRANSMIT: 'log-transmit',
      INTERCEPT: 'log-intercept',
      READ: 'log-read',
      TAMPER: 'log-tamper',
      FORWARD: 'log-forward',
      CRYPTO: 'log-crypto',
      AUTH_PASS: 'log-auth-pass',
      AUTH_FAIL: 'log-auth-fail',
      SECURITY_ALERT: 'log-alert'
    };

    const row = document.createElement('div');
    row.className = `log-line ${levelClasses[entry.level] || 'log-info'}`;
    row.innerHTML = `
      <span class="log-seq">#${String(entry.id).padStart(3, '0')}</span>
      <span class="log-time">[${entry.time}]</span>
      <span class="log-badge badge-${entry.level}">[${entry.level}]</span>
      <span class="log-msg">${this.escapeHtml(entry.message)}</span>
    `;

    container.insertBefore(row, container.firstChild);
  }

  clearLogs() {
    this.logs = [];
    this.logCounter = 0;
    const container = document.getElementById('activityLogContainer');
    if (container) container.innerHTML = '<div class="text-muted p-2">Logs cleared.</div>';
  }

  copyLogsToClipboard() {
    const text = this.logs.map(l => `#${l.id} [${l.time}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert("Activity logs copied to clipboard!");
    });
  }

  /**
   * Update Cryptographic Inspector panels with current Key and Packet
   */
  updateCryptoInspectorKey() {
    const keyEl = document.getElementById('cryptoInspectorKeyHex');
    if (keyEl && window.cryptoManager.keyRawHex) {
      keyEl.innerText = window.cryptoManager.formatHexSpaces(window.cryptoManager.keyRawHex);
    }
  }

  updateCryptoInspectorPacket(pkg) {
    const ivEl = document.getElementById('cryptoInspectorIvHex');
    const cipherEl = document.getElementById('cryptoInspectorCipherHex');
    const tagEl = document.getElementById('cryptoInspectorTagHex');

    if (ivEl) ivEl.innerText = window.cryptoManager.formatHexSpaces(pkg.ivHex);
    if (cipherEl) cipherEl.innerText = window.cryptoManager.formatHexSpaces(pkg.ciphertextHex);
    if (tagEl) tagEl.innerText = window.cryptoManager.formatHexSpaces(pkg.tagHex);
  }

  /**
   * Synthesize audio tone using Web Audio API
   */
  playTone(freq, type = 'sine', duration = 0.2) {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio not permitted without interaction
    }
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Export singleton instance to window
window.simulatorController = new SimulatorController();
