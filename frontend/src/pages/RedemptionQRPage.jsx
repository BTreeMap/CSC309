import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { transactionsAPI } from '../api';
import Layout from '../components/Layout';
import { LoadingSpinner, ErrorMessage } from '../components/shared';
import './RedemptionQRPage.css';

const RedemptionQRPage = () => {
    const { transactionId } = useParams();
    const navigate = useNavigate();

    const [transaction, setTransaction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTransaction = async () => {
            try {
                const data = await transactionsAPI.getTransaction(transactionId);
                if (data.type !== 'redemption') {
                    setError('This transaction is not a redemption request');
                    return;
                }
                setTransaction(data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load redemption details');
            } finally {
                setLoading(false);
            }
        };

        fetchTransaction();
    }, [transactionId]);

    const handleDownload = () => {
        const svg = document.querySelector('.redemption-qr-svg');
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
            link.download = `redemption-${transactionId}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const getStatusBadge = () => {
        if (transaction?.processedAt) {
            return <span className="status-badge status-processed">Processed</span>;
        }
        return <span className="status-badge status-pending">Pending</span>;
    };

    if (loading) {
        return (
            <Layout>
                <LoadingSpinner text="Loading redemption details..." />
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout>
                <div className="redemption-qr-page">
                    <ErrorMessage message={error} />
                    <div className="error-actions">
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                            Go Back
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    const isProcessed = !!transaction?.processedAt;

    return (
        <Layout>
            <div className="redemption-qr-page">
                <div className="qr-header">
                    <h1>Redemption QR Code</h1>
                    <p>Show this QR code to a cashier to process your redemption</p>
                </div>

                <div className="qr-content">
                    <div className="qr-card">
                        {isProcessed ? (
                            <div className="processed-notice">
                                <span className="processed-icon">✓</span>
                                <p>This redemption has already been processed</p>
                            </div>
                        ) : (
                            <>
                                <div className="qr-wrapper">
                                    <QRCodeSVG
                                        value={transactionId.toString()}
                                        size={250}
                                        level="H"
                                        includeMargin={true}
                                        className="redemption-qr-svg"
                                    />
                                </div>
                                <button className="btn btn-primary download-qr-button" onClick={handleDownload}>
                                    <span className="download-icon">📥</span>
                                    Download QR Code
                                </button>
                            </>
                        )}
                    </div>

                    <div className="redemption-details-card">
                        <h2>Redemption Details</h2>

                        <div className="detail-row">
                            <span className="detail-label">Request ID</span>
                            <span className="detail-value">#{transaction.id}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Points</span>
                            <span className="detail-value points-value">{Math.abs(transaction.amount).toLocaleString()}</span>
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Status</span>
                            {getStatusBadge()}
                        </div>

                        <div className="detail-row">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{formatDate(transaction.createdAt)}</span>
                        </div>

                        {transaction.processedAt && (
                            <div className="detail-row">
                                <span className="detail-label">Processed</span>
                                <span className="detail-value">{formatDate(transaction.processedAt)}</span>
                            </div>
                        )}

                        {transaction.remark && (
                            <div className="detail-row">
                                <span className="detail-label">Remark</span>
                                <span className="detail-value">{transaction.remark}</span>
                            </div>
                        )}
                    </div>

                    <div className="qr-actions">
                        <Link to="/my-transactions" className="action-link">
                            View All Transactions
                        </Link>
                        <Link to="/redemption" className="action-link">
                            Create New Redemption
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RedemptionQRPage;
