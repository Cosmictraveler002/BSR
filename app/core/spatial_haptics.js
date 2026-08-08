/**
 * ============================================================================
 * Spatial Omnidirectional Haptic Feedback Engine
 * ============================================================================
 * 
 * Features:
 * 1. Spatial DOM Vector Mapping (Centroid, Angle, Normalized Panning [-1..1], Velocity)
 * 2. Web Bluetooth GATT Hardware Bridge (4-Actuator Directional BLE Array)
 * 3. Graceful Fallback Strategy (Standard navigator.vibrate duty-cycle emulation)
 * 4. UI State Machine (Boundary Crossing, Elastic Tension, Drag Impact)
 */

export class SpatialDOMMapper {
    /**
     * Calculates spatial vector metrics between interaction point and element
     * @param {MouseEvent|Touch} pointerEvent - Native browser pointer object
     * @param {HTMLElement} element - Target DOM element
     * @param {Object} lastPointer - Previous pointer position for velocity math
     * @returns {Object} Spatial metrics (panning, angle, distance, velocity)
     */
    static calculateMetrics(pointerEvent, element, lastPointer = null) {
        const rect = element.getBoundingClientRect();
        const elementCenterX = rect.left + rect.width / 2;
        const elementCenterY = rect.top + rect.height / 2;

        const pointerX = pointerEvent.clientX;
        const pointerY = pointerEvent.clientY;

        // Normalized relative position inside element [-1.0 to 1.0]
        const normX = Math.min(Math.max(((pointerX - rect.left) / rect.width) * 2 - 1, -1), 1);
        const normY = Math.min(Math.max(((pointerY - rect.top) / rect.height) * 2 - 1, -1), 1);

        // Vector from center to pointer
        const deltaX = pointerX - elementCenterX;
        const deltaY = pointerY - elementCenterY;
        const distance = Math.hypot(deltaX, deltaY);
        const angleRad = Math.atan2(deltaY, deltaX);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Spatial Actuator Quad Panning (TL, TR, BL, BR amplitudes 0.0 to 1.0)
        const panX = (normX + 1) / 2; // 0 (Left) to 1 (Right)
        const panY = (normY + 1) / 2; // 0 (Top) to 1 (Bottom)

        const actuatorAmplitudes = {
            topLeft: (1 - panX) * (1 - panY),
            topRight: panX * (1 - panY),
            bottomLeft: (1 - panX) * panY,
            bottomRight: panX * panY
        };

        // Instantaneous Velocity calculation (px/ms)
        let velocity = 0;
        if (lastPointer && lastPointer.time) {
            const dt = Math.max(pointerEvent.timeStamp - lastPointer.time, 1);
            const dx = pointerX - lastPointer.x;
            const dy = pointerY - lastPointer.y;
            velocity = Math.hypot(dx, dy) / dt;
        }

        return {
            normX,
            normY,
            distance,
            angleDeg,
            actuatorAmplitudes,
            velocity: Math.min(velocity, 5.0) // Clamped max speed
        };
    }
}

export class WebBluetoothHapticBridge {
    constructor() {
        this.device = null;
        this.gattServer = null;
        this.hapticCharacteristic = null;
        this.isConnected = false;
        this.lastWriteTime = 0;
        this.writeThrottleMs = 16; // ~60Hz BLE update limit

        // Standard Haptic GATT Service UUIDs
        this.SERVICE_UUID = '0000fa00-0000-1000-8000-00805f9b34fb';
        this.CHARACTERISTIC_UUID = '0000fa01-0000-1000-8000-00805f9b34fb';
    }

    /**
     * Initiates Web Bluetooth pairing dialog with haptic hardware
     */
    async connect() {
        if (!navigator.bluetooth) {
            console.warn('[HapticEngine] Web Bluetooth API not supported in this browser.');
            return false;
        }

        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'SpatialHaptics' }],
                optionalServices: [this.SERVICE_UUID]
            });

            this.device.addEventListener('gattserverdisconnected', () => this.onDisconnected());

            this.gattServer = await this.device.gatt.connect();
            const service = await this.gattServer.getPrimaryService(this.SERVICE_UUID);
            this.hapticCharacteristic = await service.getCharacteristic(this.CHARACTERISTIC_UUID);

            this.isConnected = true;
            console.log('[HapticEngine] Spatial Hardware Connected via BLE');
            return true;
        } catch (error) {
            console.error('[HapticEngine] Bluetooth Connection Failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    onDisconnected() {
        this.isConnected = false;
        this.hapticCharacteristic = null;
        console.warn('[HapticEngine] Spatial Haptic Hardware Disconnected');
    }

    /**
     * Sends spatial 4-quadrant amplitude packet to BLE hardware
     * Protocol Payload Buffer (6 Bytes):
     * [0]: Command Header (0x01 = Play Frame)
     * [1]: Top-Left Intensity (0-255)
     * [2]: Top-Right Intensity (0-255)
     * [3]: Bottom-Left Intensity (0-255)
     * [4]: Bottom-Right Intensity (0-255)
     * [5]: Frequency / Waveform ID (0-255)
     */
    async sendSpatialPulse(actuatorAmplitudes, overallIntensity = 1.0, waveformId = 0x01) {
        if (!this.isConnected || !this.hapticCharacteristic) return false;

        const now = performance.now();
        if (now - this.lastWriteTime < this.writeThrottleMs) return false; // Throttle to 60Hz
        this.lastWriteTime = now;

        const buffer = new ArrayBuffer(6);
        const dataView = new DataView(buffer);

        dataView.setUint8(0, 0x01); // Header
        dataView.setUint8(1, Math.floor(actuatorAmplitudes.topLeft * overallIntensity * 255));
        dataView.setUint8(2, Math.floor(actuatorAmplitudes.topRight * overallIntensity * 255));
        dataView.setUint8(3, Math.floor(actuatorAmplitudes.bottomLeft * overallIntensity * 255));
        dataView.setUint8(4, Math.floor(actuatorAmplitudes.bottomRight * overallIntensity * 255));
        dataView.setUint8(5, waveformId);

        try {
            await this.hapticCharacteristic.writeValueWithoutResponse(buffer);
            return true;
        } catch (err) {
            return false;
        }
    }
}

export class FallbackHapticDriver {
    /**
     * Fallback driver using standard Navigator Web Haptics API
     */
    static playFallbackPattern(effectType, intensity = 1.0) {
        if (!('vibrate' in navigator)) return;

        switch (effectType) {
            case 'bump':
                // Sharp subtle tick
                navigator.vibrate(Math.max(10 * intensity, 5));
                break;

            case 'elastic':
                // Fast double pulse simulating surface drag tension
                const pulseLen = Math.max(15 * intensity, 8);
                navigator.vibrate([pulseLen, 20, pulseLen]);
                break;

            case 'impact':
                // Heavy sustained thud
                const heavyLen = Math.max(50 * intensity, 25);
                navigator.vibrate([heavyLen, 30, heavyLen / 2]);
                break;

            default:
                navigator.vibrate(15);
                break;
        }
    }
}

export class SpatialHapticController {
    constructor() {
        this.bluetoothBridge = new WebBluetoothHapticBridge();
        this.lastPointer = { x: 0, y: 0, time: 0 };
        this.boundElements = new WeakMap();

        this.initEventListeners();
    }

    /**
     * Attach Bluetooth trigger button handler
     */
    async pairHardware() {
        return await this.bluetoothBridge.connect();
    }

    /**
     * Core Dispatcher: Routes pulse to BLE hardware or Web Haptics fallback
     */
    triggerHaptic(effectType, amplitudes, intensity = 1.0, waveformId = 0x01) {
        if (this.bluetoothBridge.isConnected) {
            this.bluetoothBridge.sendSpatialPulse(amplitudes, intensity, waveformId);
        } else {
            FallbackHapticDriver.playFallbackPattern(effectType, intensity);
        }
    }

    /**
     * 1. Hover / Boundary Crossing Event Generator
     */
    handleBoundaryEnter(event, element) {
        const metrics = SpatialDOMMapper.calculateMetrics(event, element, this.lastPointer);
        // Dynamic intensity scaled by entry speed
        const intensity = Math.min(0.3 + metrics.velocity * 0.4, 1.0);
        
        this.triggerHaptic('bump', metrics.actuatorAmplitudes, intensity, 0x10);
    }

    /**
     * 2. Elasticity / Scroll Friction Generator
     * @param {HTMLElement} element - Scroll / Stretch Container
     * @param {number} stretchDistance - Current pull distance in px
     * @param {number} maxStretch - Max pull threshold in px
     */
    handleElasticStretch(event, element, stretchDistance, maxStretch = 150) {
        const metrics = SpatialDOMMapper.calculateMetrics(event, element, this.lastPointer);
        const stretchRatio = Math.min(Math.abs(stretchDistance) / maxStretch, 1.0);
        
        // Non-linear exponential friction ramp
        const intensity = Math.pow(stretchRatio, 1.8);
        const waveformId = stretchRatio > 0.8 ? 0x21 : 0x20; // High tension frequency shift

        this.triggerHaptic('elastic', metrics.actuatorAmplitudes, intensity, waveformId);
    }

    /**
     * 3. Heavy Impact / Drag Drop Generator
     */
    handleImpactDrop(event, element, massKg = 1.0) {
        const metrics = SpatialDOMMapper.calculateMetrics(event, element, this.lastPointer);
        const velocityFactor = Math.max(metrics.velocity, 0.8);
        const overallIntensity = Math.min((massKg * 0.3) + (velocityFactor * 0.4), 1.0);

        this.triggerHaptic('impact', metrics.actuatorAmplitudes, overallIntensity, 0x30);
    }

    initEventListeners() {
        window.addEventListener('pointermove', (e) => {
            this.lastPointer = {
                x: e.clientX,
                y: e.clientY,
                time: e.timeStamp
            };
        }, { passive: true });

        // Auto-bind elements marked with [data-haptic="bump"]
        document.addEventListener('pointerover', (e) => {
            const target = e.target.closest('[data-haptic="bump"]');
            if (target && !this.boundElements.has(target)) {
                this.handleBoundaryEnter(e, target);
            }
        }, { passive: true });
    }
}
