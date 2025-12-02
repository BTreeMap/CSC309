import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { LoadingSpinner } from '../components/shared';
import { createUserPayload } from '../utils/qrPayload';
import './MyQRCodePage.css';

const MyQRCodePage = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading..." />
            </Layout>
        );
    }

    // Generate QR payload with full user info
    const qrValue = user ? createUserPayload(user) : '';

    const handleDownload = () => {
        const svg = document.querySelector('.qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            const link = document.createElement('a');
            link.download = `qr-code-${user.utorid}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = `data:image/svg+xml;base64,${btoa(decodeURIComponent(encodeURIComponent(svgData)))}`;
    };

    return (
        <Layout>
            <div className="qr-code-page">
                <div className="qr-code-header">
                    <h1>My QR Code</h1>
                    <p>Show this QR code to make transactions or transfers</p>
                </div>

                <div className="qr-code-container">
                    <div className="qr-code-card">
                        <div className="qr-code-wrapper">
                            <QRCodeSVG
                                value={qrValue}
                                size={250}
                                level="H"
                                includeMargin={true}
                                className="qr-code-svg"
                            />
                        </div>

                        <div className="qr-code-info">
                            <div className="user-info-row">
                                <span className="user-info-label">User ID</span>
                                <span className="user-info-value">{user?.id}</span>
                            </div>
                            <div className="user-info-row">
                                <span className="user-info-label">UTORid</span>
                                <span className="user-info-value">{user?.utorid}</span>
                            </div>
                            <div className="user-info-row">
                                <span className="user-info-label">Name</span>
                                <span className="user-info-value">{user?.name || 'Not set'}</span>
                            </div>
                        </div>

                        <button className="btn btn-primary download-qr-button" onClick={handleDownload}>
                            <span className="download-icon">📥</span>
                            Download QR Code
                        </button>
                    </div>

                    <div className="qr-code-instructions">
                        <h2>How to use your QR Code</h2>

                        <div className="instruction-item">
                            <span className="instruction-icon">🛒</span>
                            <div className="instruction-content">
                                <h3>For Purchases</h3>
                                <p>Show this QR code to the cashier when making a purchase to earn points.</p>
                            </div>
                        </div>

                        <div className="instruction-item">
                            <span className="instruction-icon">💸</span>
                            <div className="instruction-content">
                                <h3>For Transfers</h3>
                                <p>Another user can scan your QR code to send you points.</p>
                            </div>
                        </div>

                        <div className="instruction-item">
                            <span className="instruction-icon">🔒</span>
                            <div className="instruction-content">
                                <h3>Keep it Safe</h3>
                                <p>Your QR code contains your user ID. Only share it with trusted parties.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default MyQRCodePage;
