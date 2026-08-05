-- Creates one schema per microservice (database-per-service pattern).
CREATE DATABASE IF NOT EXISTS earthscan_identity  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS earthscan_land      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS earthscan_agri      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS earthscan_water     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS earthscan_community CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'earthscan'@'%' IDENTIFIED BY 'earthscan';

GRANT ALL PRIVILEGES ON earthscan_identity.*  TO 'earthscan'@'%';
GRANT ALL PRIVILEGES ON earthscan_land.*      TO 'earthscan'@'%';
GRANT ALL PRIVILEGES ON earthscan_agri.*      TO 'earthscan'@'%';
GRANT ALL PRIVILEGES ON earthscan_water.*     TO 'earthscan'@'%';
GRANT ALL PRIVILEGES ON earthscan_community.* TO 'earthscan'@'%';

FLUSH PRIVILEGES;
