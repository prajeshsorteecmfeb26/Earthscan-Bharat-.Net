import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0f18' }}>
                <CircularProgress color="primary" />
            </Box>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = (user.role || user.Role || '').trim();
    const hasRole = allowedRoles && allowedRoles.some(r => r.toLowerCase() === userRole.toLowerCase());

    if (allowedRoles && !hasRole) {
        // Redirect unauthorized users to their specific dashboard
        let defaultRoute = '/';
        const roleLower = userRole.toLowerCase();
        if (roleLower === 'admin') defaultRoute = '/admin';
        else if (roleLower === 'land buyer') defaultRoute = '/search';
        else if (roleLower === 'agriculture expert') defaultRoute = '/expert/manage-crop';
        
        return <Navigate to={defaultRoute} replace />;
    }

    return children;
};

export default ProtectedRoute;
