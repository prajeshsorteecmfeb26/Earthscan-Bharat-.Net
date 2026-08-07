import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function AdminDashboard() {
    const { t } = useTranslation();
    return (
        <Container fluid className="p-0">
            <h2 className="text-white fw-bold mb-4">
                <i className="bi bi-shield-lock-fill text-warning"></i> {t('admin.title')}
            </h2>

            <Row className="g-4">
                <Col md={4}>
                    <Card className="glass-panel border-0 text-white h-100 p-4 text-center hover-scale">
                        <Card.Body className="d-flex flex-column justify-content-between">
                            <div>
                                <i className="bi bi-people-fill text-primary mb-3" style={{ fontSize: '4rem' }}></i>
                                <h3 className="fw-bold mb-2">{t('admin.manage_users')}</h3>
                                <p className="text-secondary mb-4">Create, read, update, and delete registered user accounts across all roles.</p>
                            </div>
                            <Link to="/admin/users" className="btn btn-outline-primary rounded-pill px-4 align-self-center">
                                {t('admin.manage_users')} <i className="bi bi-arrow-right ms-2"></i>
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="glass-panel border-0 text-white h-100 p-4 text-center hover-scale">
                        <Card.Body className="d-flex flex-column justify-content-between">
                            <div>
                                <i className="bi bi-chat-left-text-fill text-warning mb-3" style={{ fontSize: '4rem' }}></i>
                                <h3 className="fw-bold mb-2">Support Queries</h3>
                                <p className="text-secondary mb-4">Review and reply to support queries submitted by users through the Contact Us page.</p>
                            </div>
                            <Link to="/admin/queries" className="btn btn-outline-warning rounded-pill px-4 align-self-center">
                                View User Queries <i className="bi bi-arrow-right ms-2"></i>
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="glass-panel border-0 text-white h-100 p-4 text-center hover-scale">
                        <Card.Body className="d-flex flex-column justify-content-between">
                            <div>
                                <i className="bi bi-pie-chart-fill text-info mb-3" style={{ fontSize: '4rem' }}></i>
                                <h3 className="fw-bold mb-2">{t('admin.analytics_title')}</h3>
                                <p className="text-secondary mb-4">View high-level system metrics, user demographics, and API health status.</p>
                            </div>
                            <Link to="/admin/analytics" className="btn btn-outline-info rounded-pill px-4 align-self-center">
                                View Analytics <i className="bi bi-arrow-right ms-2"></i>
                            </Link>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
