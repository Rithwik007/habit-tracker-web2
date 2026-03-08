import { motion } from 'framer-motion';

export default function PageWrapper({ children }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ width: '100%', minHeight: '100%' }}
        >
            {children}
        </motion.div>
    );
}
