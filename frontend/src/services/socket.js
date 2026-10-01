import { io } from 'socket.io-client';
const SOCKET_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5001';
let socket;
export const initializeSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        socket.on('connect', () => {
        });
        socket.on('connect_error', (error) => {
            console.error('❌ Erreur de connexion Socket:', error);
        });
        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket déconnecté:', reason);
        });
    }
    return socket;
};
export default initializeSocket;
