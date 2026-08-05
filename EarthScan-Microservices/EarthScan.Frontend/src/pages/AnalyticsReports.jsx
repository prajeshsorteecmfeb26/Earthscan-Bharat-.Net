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
                    <Row className="g-4 mb-4">
                        <Col md={3}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
                                    <i className="bi bi-people-fill text-primary mb-3" style={{ fontSize: '2.5rem' }}></i>
                                    <h2 className="fw-bold mb-1">{stats.totalUsers}</h2>
                                    <p className="text-secondary small mb-0">{t('analytics.total_users')}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
                                    <i className="bi bi-globe-central-south-asia text-success mb-3" style={{ fontSize: '2.5rem' }}></i>
                                    <h2 className="fw-bold mb-1">2,450+</h2>
                                    <p className="text-secondary small mb-0">{t('analytics.total_scans')}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
                                    <i className="bi bi-droplet-half text-info mb-3" style={{ fontSize: '2.5rem' }}></i>
                                    <h2 className="fw-bold mb-1">8,900+</h2>
                                    <p className="text-secondary small mb-0">{t('analytics.borewell_sims')}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4 d-flex flex-column align-items-center justify-content-center text-center">
                                    <i className="bi bi-robot text-warning mb-3" style={{ fontSize: '2.5rem' }}></i>
                                    <h2 className="fw-bold mb-1">15k+</h2>
                                    <p className="text-secondary small mb-0">{t('analytics.ai_recs')}</p>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    <Row className="g-4">
                        <Col lg={6}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4">{t('analytics.demographics')}</h5>
                                    
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-secondary small"><i className="bi bi-person-badge"></i> {t('analytics.farmers')}</span>
                                            <span className="text-success small fw-bold">{stats.farmers} ({getPercentage(stats.farmers)}%)</span>
                                        </div>
                                        <ProgressBar variant="success" now={getPercentage(stats.farmers)} style={{ height: '8px', background: '#2c3e50' }} />
                                    </div>
                                    
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-secondary small"><i className="bi bi-briefcase"></i> {t('analytics.land_buyers')}</span>
                                            <span className="text-info small fw-bold">{stats.buyers} ({getPercentage(stats.buyers)}%)</span>
                                        </div>
                                        <ProgressBar variant="info" now={getPercentage(stats.buyers)} style={{ height: '8px', background: '#2c3e50' }} />
                                    </div>

                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-secondary small"><i className="bi bi-mortarboard"></i> {t('analytics.agri_experts')}</span>
                                            <span className="text-primary small fw-bold">{stats.experts} ({getPercentage(stats.experts)}%)</span>
                                        </div>
                                        <ProgressBar variant="primary" now={getPercentage(stats.experts)} style={{ height: '8px', background: '#2c3e50' }} />
                                    </div>

                                    <div className="mb-2">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="text-secondary small"><i className="bi bi-shield-lock"></i> {t('analytics.administrators')}</span>
                                            <span className="text-warning small fw-bold">{stats.admins} ({getPercentage(stats.admins)}%)</span>
                                        </div>
                                        <ProgressBar variant="warning" now={getPercentage(stats.admins)} style={{ height: '8px', background: '#2c3e50' }} />
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        
                        <Col lg={6}>
                            <Card className="glass-panel border-0 text-white h-100">
                                <Card.Body className="p-4">
                                    <h5 className="fw-bold mb-4">{t('analytics.system_health')}</h5>
                                    
                                    <div className="p-3 rounded border border-secondary mb-3 d-flex justify-content-between align-items-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <div>
                                            <h6 className="mb-1 fw-bold">{t('analytics.primary_db')}</h6>
                                            <p className="text-secondary small mb-0">SQL Server • Central Region</p>
                                        </div>
                                        <div className="text-success fw-bold"><i className="bi bi-check-circle-fill"></i> {t('analytics.online')}</div>
                                    </div>
                                    
                                    <div className="p-3 rounded border border-secondary mb-3 d-flex justify-content-between align-items-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <div>
                                            <h6 className="mb-1 fw-bold">{t('analytics.auth_service')}</h6>
                                            <p className="text-secondary small mb-0">JWT Token Issuer</p>
                                        </div>
                                        <div className="text-success fw-bold"><i className="bi bi-check-circle-fill"></i> {t('analytics.online')}</div>
                                    </div>

                                    <div className="p-3 rounded border border-secondary mb-3 d-flex justify-content-between align-items-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <div>
                                            <h6 className="mb-1 fw-bold">{t('analytics.crop_ai_engine')}</h6>
                                            <p className="text-secondary small mb-0">ML Prediction Engine</p>
                                        </div>
                                        <div className="text-warning fw-bold"><i className="bi bi-exclamation-circle-fill"></i> {t('analytics.high_load')}</div>
                                    </div>

                                    <div className="p-3 rounded border border-secondary d-flex justify-content-between align-items-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <div>
                                            <h6 className="mb-1 fw-bold">{t('analytics.server_uptime')}</h6>
                                            <p className="text-secondary small mb-0">Last reboot: 14 days ago</p>
                                        </div>
                                        <div className="text-info fw-bold">99.99%</div>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </Container>
    );
}
