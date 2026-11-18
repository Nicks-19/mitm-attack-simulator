/**
 * Man-in-the-Middle (MITM) Attack Simulator
 * Communication State Matrix & State Machine Manager
 *
 * Tracks the 7 distinct lifecycle stages of communication:
 * 1. Initial state
 * 2. Message sent
 * 3. Message intercepted
 * 4. Message read
 * 5. Message modified
 * 6. Message forwarded
 * 7. Message received
 */

class CommunicationStateMachine {
  constructor() {
    this.STAGES = [
      {
        id: 'initial',
        number: 1,
        title: 'Initial State',
        actor: 'System / Network',
        actorRole: 'Idle Channel',
        description: 'Communication channel is idle. Alice has not transmitted any packet. Bob is awaiting connection.',
        defaultBadge: 'IDLE'
      },
      {
        id: 'sent',
        number: 2,
        title: 'Message Sent',
        actor: 'Alice',
        actorRole: 'Client / Originator',
        description: 'Alice inputs message, prepares packet (plaintext or AES-GCM encrypted), and transmits across network.',
        defaultBadge: 'TRANSMITTED'
      },
      {
        id: 'intercepted',
        number: 3,
        title: 'Message Intercepted',
        actor: 'Eve',
        actorRole: 'Adversary (MITM)',
        description: 'Eve exploits network positioning (e.g. ARP poisoning or rogue proxy) to siphon the packet mid-flight.',
        defaultBadge: 'INTERCEPTED'
      },
      {
        id: 'read',
        number: 4,
        title: 'Message Read',
        actor: 'Eve',
        actorRole: 'Adversary (Inspector)',
        description: 'Eve parses packet buffers. In plaintext mode, contents are readable; in AES-GCM mode, only high-entropy ciphertext is visible.',
        defaultBadge: 'INSPECTED'
      },
      {
        id: 'modified',
        number: 5,
        title: 'Message Modified',
        actor: 'Eve',
        actorRole: 'Adversary (Tamperer)',
        description: 'Eve manipulates payload data (e.g., changing wire funds, credentials, or flipping ciphertext bits).',
        defaultBadge: 'TAMPERED / UNCHANGED'
      },
      {
        id: 'forwarded',
        number: 6,
        title: 'Message Forwarded',
        actor: 'Eve',
        actorRole: 'Adversary (Forwarder)',
        description: 'Eve relays the packet to Bob to preserve the illusion of a legitimate, uninterrupted session.',
        defaultBadge: 'RELAYED'
      },
      {
        id: 'received',
        number: 7,
        title: 'Message Received',
        actor: 'Bob',
        actorRole: 'Server / Destination',
        description: 'Bob accepts the packet, processes the payload, and performs AES-GCM GMAC authentication verification.',
        defaultBadge: 'RECEIVED / VERIFIED'
      }
    ];

    this.currentStageId = 'initial';
    this.stageStates = {};
    this.history = [];
    this.listeners = [];
    this.reset();
  }

  /**
   * Reset the state machine back to Initial State
   */
  reset() {
    this.currentStageId = 'initial';
    this.history = [];
    this.stageStates = {};

    this.STAGES.forEach(stage => {
      this.stageStates[stage.id] = {
        status: stage.id === 'initial' ? 'active' : 'pending',
        timestamp: stage.id === 'initial' ? this.getFormattedTime() : null,
        payloadSnapshot: stage.id === 'initial' ? 'None (Channel Idle)' : '—',
        securityNote: stage.id === 'initial' ? 'Ready for transmission' : 'Pending',
        isTampered: false,
        authStatus: 'N/A'
      };
    });

    this.recordHistory('initial', 'Simulation reset to Initial State.');
    this.notifyListeners();
  }

  /**
   * Transition to a specific stage
   * @param {string} stageId - Stage identifier
   * @param {Object} details - Snapshot details (payload, note, isTampered, authStatus)
   */
  transitionTo(stageId, details = {}) {
    const stageIndex = this.STAGES.findIndex(s => s.id === stageId);
    if (stageIndex === -1) {
      console.error(`Unknown stage ID: ${stageId}`);
      return;
    }

    // Mark previous stages as completed
    for (let i = 0; i < stageIndex; i++) {
      const prevId = this.STAGES[i].id;
      if (this.stageStates[prevId].status !== 'completed') {
        this.stageStates[prevId].status = 'completed';
      }
    }

    this.currentStageId = stageId;
    this.stageStates[stageId] = {
      status: 'active',
      timestamp: this.getFormattedTime(),
      payloadSnapshot: details.payload || '—',
      securityNote: details.note || this.STAGES[stageIndex].description,
      isTampered: details.isTampered || false,
      authStatus: details.authStatus || 'N/A'
    };

    this.recordHistory(stageId, details.note || `Transitioned to ${this.STAGES[stageIndex].title}`);
    this.notifyListeners();
  }

  /**
   * Mark stage as completed
   */
  completeStage(stageId) {
    if (this.stageStates[stageId]) {
      this.stageStates[stageId].status = 'completed';
      this.notifyListeners();
    }
  }

  /**
   * Record state change in historical timeline
   */
  recordHistory(stageId, comment) {
    this.history.push({
      eventNumber: this.history.length + 1,
      stageId: stageId,
      time: this.getFormattedTime(),
      comment: comment
    });
  }

  /**
   * Subscribe a listener function to state changes
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  /**
   * Notify all registered listeners
   */
  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.getSummary());
      } catch (err) {
        console.error('State listener error:', err);
      }
    });
  }

  /**
   * Get formatted local time string with milliseconds
   */
  getFormattedTime() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  /**
   * Get full state snapshot summary
   */
  getSummary() {
    return {
      currentStageId: this.currentStageId,
      currentStageInfo: this.STAGES.find(s => s.id === this.currentStageId),
      stages: this.STAGES.map(s => ({
        ...s,
        stateData: this.stageStates[s.id]
      })),
      history: [...this.history]
    };
  }
}

// Export singleton instance to window
window.communicationStateMachine = new CommunicationStateMachine();
