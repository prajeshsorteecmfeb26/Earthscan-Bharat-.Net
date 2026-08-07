import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function AboutUs() {
    return (
        <div style={{
            background: 'url("https://images.unsplash.com/photo-1592982537447-6f2a6a0a38cc?q=80&w=2070&auto=format&fit=crop") no-repeat center center fixed',
            backgroundSize: 'cover',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center'
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={10} lg={8}>
                        <Card className="glass-panel text-white border-0 shadow-lg p-5 text-center" style={{ background: 'rgba(10, 15, 24, 0.85)', backdropFilter: 'blur(10px)' }}>
                            <Card.Body>
                                <h1 className="fw-bold mb-4"><span style={{ color: '#00e676' }}>EarthScan</span> <span style={{ color: '#2979ff' }}>Bharat</span></h1>
                                <p className="lead mb-4">
                                    EarthScan Bharat is a revolutionary platform designed to empower the agricultural community with data-driven insights. 
                                    By leveraging geospatial intelligence, satellite data, and localized ground-truth information, we aim to bridge the gap between technology and the traditional farmer.
                                </p>
                                <Row className="g-4 mb-5 text-start">
                                    <Col md={6}>
                                        <div className="p-4 rounded border border-secondary h-100" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <h4 className="fw-bold text-success mb-3"><i className="bi bi-bullseye"></i> Our Mission</h4>
                                            <p className="small text-secondary mb-0">To democratize access to advanced agricultural data, helping farmers optimize crop yields, manage water resources efficiently and secure better market prices.</p>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="p-4 rounded border border-secondary h-100" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <h4 className="fw-bold text-primary mb-3"><i className="bi bi-eye"></i> Our Vision</h4>
                                            <p className="small text-secondary mb-0">A sustainable and prosperous rural India where every decision is backed by intelligent data, securing food futures and uplifting the farming community.</p>
                                        </div>
                                    </Col>
                                </Row>
                                <div className="d-flex justify-content-center gap-3">
                                    <Button as={Link} to="/register" variant="success" className="px-4 py-2 fw-bold rounded-pill">Join Us Today</Button>
                                    <Button as={Link} to="/contact" variant="outline-light" className="px-4 py-2 fw-bold rounded-pill">Contact Us</Button>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}
