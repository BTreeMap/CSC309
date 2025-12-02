import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';
import './QrScanner.css';

/**
 * QrScanner Component
 * A reusable QR code scanner using the qr-scanner library by Nimiq.
 * Uses Web Workers for performance and native BarcodeDetector API when available.
 * 
 * @param {function} onScan - Callback when QR code is successfully scanned (receives data string)
 * @param {function} onError - Optional callback for errors
 * @param {function} onClose - Callback when scanner is closed
 * @param {boolean} isOpen - Whether the scanner modal is open
 */
const QrScannerComponent = ({ onScan, onError, onClose, isOpen }) => {
    const videoRef = useRef(null);
    const scannerRef = useRef(null);
    const [hasCamera, setHasCamera] = useState(true);
    const [cameraError, setCameraError] = useState(null);
    const [isStarting, setIsStarting] = useState(true);
    const [hasFlash, setHasFlash] = useState(false);
    const [flashOn, setFlashOn] = useState(false);

    useEffect(() => {
        // Check if device has a camera
        QrScanner.hasCamera().then(setHasCamera);
    }, []);

    useEffect(() => {
        if (!isOpen || !videoRef.current || !hasCamera) return;

        let mounted = true;
        setIsStarting(true);
        setCameraError(null);

        // Create scanner instance
        const qrScanner = new QrScanner(
            videoRef.current,
            (result) => {
                // Successfully scanned a QR code
                if (mounted && result?.data) {
                    // Vibrate if supported (mobile feedback)
                    if (navigator.vibrate) {
                        navigator.vibrate(100);
                    }
                    onScan(result.data);
                }
            },
            {
                returnDetailedScanResult: true,
                highlightScanRegion: true,
                highlightCodeOutline: true,
                preferredCamera: 'environment', // Prefer back camera
                maxScansPerSecond: 10, // Battery-friendly scanning rate
            }
        );

        scannerRef.current = qrScanner;

        // Start the scanner
        qrScanner.start()
            .then(() => {
                if (mounted) {
                    setIsStarting(false);
                    // Check for flash support after camera starts
                    qrScanner.hasFlash().then(setHasFlash);
                }
            })
            .catch((err) => {
                if (mounted) {
                    console.error('QR Scanner error:', err);
                    setCameraError(getErrorMessage(err));
                    setIsStarting(false);
                    onError?.(err);
                }
            });

        // Cleanup on unmount or when modal closes
        return () => {
            mounted = false;
            if (scannerRef.current) {
                scannerRef.current.destroy();
                scannerRef.current = null;
            }
        };
    }, [isOpen, hasCamera, onScan, onError]);

    const getErrorMessage = (error) => {
        const message = error?.message || error?.name || String(error);

        if (message.includes('NotAllowedError') || message.includes('Permission')) {
            return 'Camera access was denied. Please allow camera access in your browser settings.';
        }
        if (message.includes('NotFoundError') || message.includes('DevicesNotFound')) {
            return 'No camera found on this device.';
        }
        if (message.includes('NotReadableError') || message.includes('TrackStartError')) {
            return 'Camera is in use by another application.';
        }
        if (message.includes('OverconstrainedError')) {
            return 'Camera does not meet the required constraints.';
        }
        if (message.includes('SecurityError')) {
            return 'Camera access requires a secure connection (HTTPS).';
        }

        return 'Failed to start camera. Please try again.';
    };

    const toggleFlash = async () => {
        if (!scannerRef.current || !hasFlash) return;

        try {
            await scannerRef.current.toggleFlash();
            setFlashOn(!flashOn);
        } catch (err) {
            console.warn('Failed to toggle flash:', err);
        }
    };

    const handleClose = () => {
        if (scannerRef.current) {
            scannerRef.current.stop();
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="qr-scanner-modal" onClick={handleClose}>
            <div className="qr-scanner-content" onClick={(e) => e.stopPropagation()}>
                <div className="qr-scanner-header">
                    <h2>Scan QR Code</h2>
                    <button className="qr-scanner-close" onClick={handleClose} aria-label="Close">
                        ✕
                    </button>
                </div>

                <div className="qr-scanner-body">
                    {!hasCamera ? (
                        <div className="qr-scanner-error">
                            <span className="error-icon">📷</span>
                            <p>No camera available on this device</p>
                            <button className="btn btn-secondary" onClick={handleClose}>
                                Close
                            </button>
                        </div>
                    ) : cameraError ? (
                        <div className="qr-scanner-error">
                            <span className="error-icon">⚠️</span>
                            <p>{cameraError}</p>
                            <button className="btn btn-secondary" onClick={handleClose}>
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="qr-scanner-viewport">
                                <video ref={videoRef} playsInline />
                                {isStarting && (
                                    <div className="qr-scanner-loading">
                                        <div className="loading-spinner"></div>
                                        <p>Starting camera...</p>
                                    </div>
                                )}
                            </div>

                            <div className="qr-scanner-instructions">
                                <p>Point your camera at a QR code</p>
                            </div>

                            <div className="qr-scanner-controls">
                                {hasFlash && (
                                    <button
                                        className={`btn btn-ghost flash-button ${flashOn ? 'active' : ''}`}
                                        onClick={toggleFlash}
                                        aria-label={flashOn ? 'Turn off flash' : 'Turn on flash'}
                                    >
                                        {flashOn ? '🔦' : '💡'} Flash
                                    </button>
                                )}
                                <button className="btn btn-secondary" onClick={handleClose}>
                                    Cancel
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QrScannerComponent;
