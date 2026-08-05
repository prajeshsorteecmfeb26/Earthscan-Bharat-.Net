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

    const userRole = user.role || user.Role;

    if (allowedRoles && !allowedRoles.includes(userRole)) {
        // Redirect unauthorized users to their specific dashboard
        let defaultRoute = '/';
        if (userRole === 'Admin') defaultRoute = '/admin';
        else if (userRole === 'Land Buyer') defaultRoute = '/search';
        else if (userRole === 'Agriculture Expert') defaultRoute = '/expert/queries';
        
        return <Navigate to={defaultRoute} replace />;
    }

    return children;
};

export default ProtectedRoute;
