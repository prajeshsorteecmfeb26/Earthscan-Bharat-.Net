import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';

export default function AnalyticsReports() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        farmers: 0,
        buyers: 0,
        experts: 0,
        admins: 0
    });
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // We use the existing users endpoint to calculate metrics
            const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
            const users = response.data;
            
            setStats({
                totalUsers: users.length,
                farmers: users.filter(u => u.role === 'Farmer').length,
                buyers: users.filter(u => u.role === 'Land Buyer').length,
                experts: users.filter(u => u.role === 'Agriculture Expert').length,
                admins: users.filter(u => u.role === 'Admin').length,
            });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setErrorMsg(error.response?.data?.message || error.message || 'Failed to load metrics');
            setLoading(false);
        }
    };

    const getPercentage = (count) => {
        if (stats.totalUsers === 0) return 0;
        return Math.round((count / stats.totalUsers) * 100);
    };

    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-pie-chart-fill text-info"></i> {t('analytics.title')}
            </h2>

            {loading ? (
                <div className="text-center p-5 text-secondary">{t('analytics.loading')}</div>
            ) : errorMsg ? (
                <div className="text-center p-5 text-danger border border-danger rounded bg-danger bg-opacity-10">
                    <i className="bi bi-exclamation-triangle-fill fs-3 mb-2 d-block"></i>
                    {errorMsg}
                </div>
            ) : (
                <>


                    <Row className="g-4">
                        <Col xs={12}>
                            <Card className="glass-panel border-0 text-white">
                                <Card.Body className="p-4">
                                    <div className="d-flex justify-content-between align-items-center mb-4">
                                        <h5 className="fw-bold mb-0">
                                            <i className="bi bi-people-fill text-info me-2"></i>
                                            {t('analytics.demographics')}
                                        </h5>
                                        <span className="badge bg-secondary bg-opacity-50 text-white px-3 py-2 fs-6 fw-semibold rounded-pill border border-secondary border-opacity-50">
                                            {stats.totalUsers} {t('analytics.total_users')}
                                        </span>
                                    </div>
                                    
                                    <Row className="g-4">
                                        <Col md={6} xl={3}>
                                            <div className="p-3 rounded-3 border border-secondary border-opacity-25 h-100" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-secondary small fw-semibold">
                                                        <i className="bi bi-person-badge text-success me-1"></i> {t('analytics.farmers')}
                                                    </span>
                                                    <span className="text-success small fw-bold fs-6">{stats.farmers} ({getPercentage(stats.farmers)}%)</span>
                                                </div>
                                                <ProgressBar variant="success" now={getPercentage(stats.farmers)} style={{ height: '8px', background: '#2c3e50' }} className="rounded-pill" />
                                            </div>
                                        </Col>

                                        <Col md={6} xl={3}>
                                            <div className="p-3 rounded-3 border border-secondary border-opacity-25 h-100" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-secondary small fw-semibold">
                                                        <i className="bi bi-briefcase text-info me-1"></i> {t('analytics.land_buyers')}
                                                    </span>
                                                    <span className="text-info small fw-bold fs-6">{stats.buyers} ({getPercentage(stats.buyers)}%)</span>
                                                </div>
                                                <ProgressBar variant="info" now={getPercentage(stats.buyers)} style={{ height: '8px', background: '#2c3e50' }} className="rounded-pill" />
                                            </div>
                                        </Col>

                                        <Col md={6} xl={3}>
                                            <div className="p-3 rounded-3 border border-secondary border-opacity-25 h-100" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-secondary small fw-semibold">
                                                        <i className="bi bi-mortarboard text-primary me-1"></i> {t('analytics.agri_experts')}
                                                    </span>
                                                    <span className="text-primary small fw-bold fs-6">{stats.experts} ({getPercentage(stats.experts)}%)</span>
                                                </div>
                                                <ProgressBar variant="primary" now={getPercentage(stats.experts)} style={{ height: '8px', background: '#2c3e50' }} className="rounded-pill" />
                                            </div>
                                        </Col>

                                        <Col md={6} xl={3}>
                                            <div className="p-3 rounded-3 border border-secondary border-opacity-25 h-100" style={{ background: 'rgba(0,0,0,0.25)' }}>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-secondary small fw-semibold">
                                                        <i className="bi bi-shield-lock text-warning me-1"></i> {t('analytics.administrators')}
                                                    </span>
                                                    <span className="text-warning small fw-bold fs-6">{stats.admins} ({getPercentage(stats.admins)}%)</span>
                                                </div>
                                                <ProgressBar variant="warning" now={getPercentage(stats.admins)} style={{ height: '8px', background: '#2c3e50' }} className="rounded-pill" />
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}
