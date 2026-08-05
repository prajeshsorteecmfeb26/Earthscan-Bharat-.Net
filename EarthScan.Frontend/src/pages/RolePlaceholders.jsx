import React from 'react';
import { Container, Card } from 'react-bootstrap';
import InsightsFooter from '../components/InsightsFooter';

const PlaceholderTemplate = ({ title, icon, description }) => (
    <Container fluid className="p-0 d-flex flex-column" style={{ minHeight: '85vh' }}>
        <div className="flex-grow-1 d-flex justify-content-center align-items-center">
            <Card className="glass-panel border-0 text-white text-center p-5 mx-3" style={{ maxWidth: '600px' }}>
                <Card.Body>
                    <i className={`bi ${icon} text-primary mb-4`} style={{ fontSize: '4rem' }}></i>
                    <h2 className="fw-bold mb-3">{title}</h2>
                    <p className="text-secondary mb-4">{description}</p>
                    <div className="d-inline-block px-4 py-2 rounded-pill" style={{ background: 'rgba(41, 121, 255, 0.2)', color: '#2979ff', border: '1px solid #2979ff' }}>
                        <i className="bi bi-tools me-2"></i> Under Construction
                    </div>
                </Card.Body>
            </Card>
        </div>
        <InsightsFooter />
    </Container>
);

export const CompareLand = () => <PlaceholderTemplate title="Compare Land" icon="bi-layout-split" description="Compare multiple properties side-by-side based on price, soil health, water availability, and historical yield data to make the best investment decision." />;

export const InvestmentAnalysis = () => <PlaceholderTemplate title="Investment Analysis" icon="bi-graph-up-arrow" description="Deep dive into ROI projections, historical price trends, and agricultural yield forecasts for specific regions and parcels of land." />;

export const AnswerQueries = () => <PlaceholderTemplate title="Expert Q&A Portal" icon="bi-chat-left-dots" description="Review and answer technical queries from farmers regarding soil health, disease identification, and fertilizer recommendations." />;

export const ManageCropContent = () => <PlaceholderTemplate title="Manage Crop Data" icon="bi-database-fill-gear" description="Update the central repository of crop parameters, fertilizer recommendations, and ML model thresholds to ensure accurate AI predictions." />;

export const Forum = () => <PlaceholderTemplate title="Community Forum" icon="bi-people-fill" description="Connect with other farmers, share experiences, discuss mandi prices, and ask for advice from the community and verified experts." />;

export const ManageUsers = () => <PlaceholderTemplate title="User Management" icon="bi-person-lines-fill" description="View, edit, and manage all registered accounts on the platform across all roles (Farmers, Buyers, Experts)." />;

export const AnalyticsReports = () => <PlaceholderTemplate title="Analytics & Reports" icon="bi-pie-chart-fill" description="Platform-wide analytics detailing user engagement, top searched regions, and system health metrics." />;
