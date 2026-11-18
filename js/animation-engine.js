/**
 * Man-in-the-Middle (MITM) Attack Simulator
 * Interactive Network Visualization & Animation Engine
 *
 * Renders the live Alice-Eve-Bob network topology diagram,
 * animated SVG transmission arrows, flying data packets,
 * and active node visual indicators.
 */

class NetworkAnimationEngine {
  constructor(containerId = 'networkDiagramContainer') {
    this.container = document.getElementById(containerId);
    this.packetElement = null;
    this.currentAnimation = null;
    this.svg = null;
    this.paths = {};
    this.nodes = {};
    this.initialized = false;
  }

  /**
   * Initialize SVG paths and node coordinates
   */
  init() {
    this.container = document.getElementById('networkDiagramContainer');
    if (!this.container) return;

    this.aliceNode = document.getElementById('aliceNodeCard');
    this.eveNode = document.getElementById('eveNodeCard');
    this.bobNode = document.getElementById('bobNodeCard');
    this.packetElement = document.getElementById('animatedDataPacket');
    this.svg = document.getElementById('networkSvgOverlay');

    this.pathAliceToEve = document.getElementById('svgPathAliceEve');
    this.pathEveToBob = document.getElementById('svgPathEveBob');
    this.pathDirect = document.getElementById('svgPathDirect');

    this.initialized = true;
    this.updateSvgPaths();

    window.addEventListener('resize', () => {
      this.updateSvgPaths();
    });
  }

  /**
   * Recalculate dynamic SVG bezier curve paths between nodes
   */
  updateSvgPaths() {
    if (!this.container || !this.aliceNode || !this.eveNode || !this.bobNode) return;

    const containerRect = this.container.getBoundingClientRect();
    const aliceRect = this.aliceNode.getBoundingClientRect();
    const eveRect = this.eveNode.getBoundingClientRect();
    const bobRect = this.bobNode.getBoundingClientRect();

    // Node connection points relative to container
    const alicePoint = {
      x: aliceRect.right - containerRect.left,
      y: aliceRect.top + aliceRect.height / 2 - containerRect.top
    };

    const eveLeftPoint = {
      x: eveRect.left - containerRect.left,
      y: eveRect.top + eveRect.height / 2 - containerRect.top
    };

    const eveRightPoint = {
      x: eveRect.right - containerRect.left,
      y: eveRect.top + eveRect.height / 2 - containerRect.top
    };

    const bobPoint = {
      x: bobRect.left - containerRect.left,
      y: bobRect.top + bobRect.height / 2 - containerRect.top
    };

    // Calculate smooth curved paths
    const dAliceEve = `M ${alicePoint.x} ${alicePoint.y} C ${(alicePoint.x + eveLeftPoint.x) / 2} ${alicePoint.y - 30}, ${(alicePoint.x + eveLeftPoint.x) / 2} ${eveLeftPoint.y}, ${eveLeftPoint.x} ${eveLeftPoint.y}`;
    const dEveBob = `M ${eveRightPoint.x} ${eveRightPoint.y} C ${(eveRightPoint.x + bobPoint.x) / 2} ${eveRightPoint.y}, ${(eveRightPoint.x + bobPoint.x) / 2} ${bobPoint.y - 30}, ${bobPoint.x} ${bobPoint.y}`;
    const dDirect = `M ${alicePoint.x} ${alicePoint.y + 40} C ${(alicePoint.x + bobPoint.x) / 2} ${containerRect.height - 20}, ${(alicePoint.x + bobPoint.x) / 2} ${containerRect.height - 20}, ${bobPoint.x} ${bobPoint.y + 40}`;

    if (this.pathAliceToEve) this.pathAliceToEve.setAttribute('d', dAliceEve);
    if (this.pathEveToBob) this.pathEveToBob.setAttribute('d', dEveBob);
    if (this.pathDirect) this.pathDirect.setAttribute('d', dDirect);
  }

  /**
   * Set active highlighting on a node
   * @param {'alice'|'eve'|'bob'|'none'} nodeName
   */
  setActiveNode(nodeName) {
    ['alice', 'eve', 'bob'].forEach(name => {
      const el = document.getElementById(`${name}NodeCard`);
      if (el) {
        if (name === nodeName) {
          el.classList.add('node-active-pulse');
        } else {
          el.classList.remove('node-active-pulse');
        }
      }
    });
  }

  /**
   * Set arrow visual state
   * @param {'leg1'|'leg2'|'both'|'none'} leg
   * @param {'normal'|'secure'|'tampered'|'idle'} state
   */
  setPathState(leg, state) {
    const classMap = {
      normal: 'svg-flow-normal',
      secure: 'svg-flow-secure',
      tampered: 'svg-flow-tampered',
      idle: 'svg-flow-idle'
    };

    const updatePath = (pathEl, markerId) => {
      if (!pathEl) return;
      pathEl.classList.remove('svg-flow-normal', 'svg-flow-secure', 'svg-flow-tampered', 'svg-flow-idle');
      pathEl.classList.add(classMap[state] || 'svg-flow-idle');
      if (markerId) {
        pathEl.setAttribute('marker-end', `url(#${markerId})`);
      }
    };

    let marker = 'arrowhead-normal';
    if (state === 'secure') marker = 'arrowhead-secure';
    if (state === 'tampered') marker = 'arrowhead-tampered';

    if (leg === 'leg1' || leg === 'both') {
      updatePath(this.pathAliceToEve, marker);
    }
    if (leg === 'leg2' || leg === 'both') {
      updatePath(this.pathEveToBob, marker);
    }
  }

  /**
   * Animate packet traveling from Alice to Eve
   * @param {boolean} isSecure - If encrypted with AES-GCM
   * @param {Function} onArrival - Callback upon reaching Eve
   */
  animateAliceToEve(isSecure, onArrival) {
    if (!this.packetElement) return;

    this.setActiveNode('alice');
    this.setPathState('leg1', isSecure ? 'secure' : 'normal');

    this.packetElement.style.display = 'flex';
    this.packetElement.className = `animated-packet ${isSecure ? 'packet-secure' : 'packet-plain'}`;
    this.packetElement.innerHTML = isSecure
      ? `<i class="bi bi-shield-lock-fill"></i><span>AES-GCM</span>`
      : `<i class="bi bi-envelope-fill"></i><span>HTTP</span>`;

    const path = this.pathAliceToEve;
    if (!path) {
      if (onArrival) onArrival();
      return;
    }

    const pathLength = path.getTotalLength();
    const duration = 1200; // ms
    let startTime = null;

    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease in-out
      const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

      const point = path.getPointAtLength(easeProgress * pathLength);
      this.packetElement.style.transform = `translate(${point.x - 24}px, ${point.y - 18}px)`;

      if (progress < 1) {
        this.currentAnimation = requestAnimationFrame(step);
      } else {
        this.currentAnimation = null;
        this.setActiveNode('eve');
        this.triggerEveInterceptionEffect();
        if (onArrival) onArrival();
      }
    };

    this.currentAnimation = requestAnimationFrame(step);
  }

  /**
   * Visual burst effect when Eve intercepts the message
   */
  triggerEveInterceptionEffect() {
    const radar = document.getElementById('eveRadarOverlay');
    if (radar) {
      radar.classList.add('radar-intercept-active');
      setTimeout(() => {
        radar.classList.remove('radar-intercept-active');
      }, 1000);
    }
  }

  /**
   * Animate packet traveling from Eve to Bob
   * @param {boolean} isTampered - Whether Eve altered the message
   * @param {boolean} isSecure - Whether secure mode is active
   * @param {Function} onArrival - Callback upon reaching Bob
   */
  animateEveToBob(isTampered, isSecure, onArrival) {
    if (!this.packetElement) return;

    this.setActiveNode('eve');
    this.setPathState('leg2', isTampered ? 'tampered' : (isSecure ? 'secure' : 'normal'));

    let packetClass = 'packet-plain';
    if (isTampered) {
      packetClass = 'packet-tampered';
    } else if (isSecure) {
      packetClass = 'packet-secure';
    }

    this.packetElement.className = `animated-packet ${packetClass}`;
    this.packetElement.innerHTML = isTampered
      ? `<i class="bi bi-exclamation-triangle-fill"></i><span>TAMPERED</span>`
      : (isSecure ? `<i class="bi bi-shield-lock-fill"></i><span>AES-GCM</span>` : `<i class="bi bi-envelope-fill"></i><span>HTTP</span>`);

    const path = this.pathEveToBob;
    if (!path) {
      if (onArrival) onArrival();
      return;
    }

    const pathLength = path.getTotalLength();
    const duration = 1200; // ms
    let startTime = null;

    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
    }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

      const point = path.getPointAtLength(easeProgress * pathLength);
      this.packetElement.style.transform = `translate(${point.x - 24}px, ${point.y - 18}px)`;

      if (progress < 1) {
        this.currentAnimation = requestAnimationFrame(step);
      } else {
        this.currentAnimation = null;
        this.setActiveNode('bob');
        this.packetElement.style.display = 'none';
        if (onArrival) onArrival();
      }
    };

    this.currentAnimation = requestAnimationFrame(step);
  }

  /**
   * Visual verification effect on Bob's node
   * @param {boolean} isVerified - True if authenticated, false if tag mismatch / corrupted
   */
  triggerBobVerification(isVerified, isPlaintext = false) {
    const badge = document.getElementById('bobVerificationResultBadge');
    if (!badge) return;

    badge.className = 'badge-verification-result';
    if (isPlaintext) {
      badge.classList.add('verification-plaintext');
      badge.innerHTML = `<i class="bi bi-shield-slash"></i> Insecure Plaintext (Unauthenticated)`;
    } else if (isVerified) {
      badge.classList.add('verification-pass');
      badge.innerHTML = `<i class="bi bi-shield-fill-check"></i> AES-GCM Tag Verified Authentic`;
    } else {
      badge.classList.add('verification-fail');
      badge.innerHTML = `<i class="bi bi-shield-fill-x"></i> GMAC Tag Mismatch: Tampering Detected!`;
    }

    badge.style.display = 'inline-flex';
  }

  /**
   * Reset the visualization to idle initial state
   */
  reset() {
    if (this.currentAnimation) {
      cancelAnimationFrame(this.currentAnimation);
      this.currentAnimation = null;
    }

    if (this.packetElement) {
      this.packetElement.style.display = 'none';
      this.packetElement.style.transform = 'translate(-100px, -100px)';
      this.packetElement.className = 'animated-packet';
    }

    this.setActiveNode('none');
    this.setPathState('both', 'idle');

    const badge = document.getElementById('bobVerificationResultBadge');
    if (badge) {
      badge.style.display = 'none';
      badge.className = 'badge-verification-result';
    }
  }
}

// Export singleton instance to window
window.networkAnimationEngine = new NetworkAnimationEngine();
