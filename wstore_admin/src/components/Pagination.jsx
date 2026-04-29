import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            <button 
                className="pagination-btn" 
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                <ChevronLeft size={18} />
            </button>
            <span className="pagination-info">
                Page {currentPage} of {totalPages}
            </span>
            <button 
                className="pagination-btn" 
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                <ChevronRight size={18} />
            </button>
        </div>
    );
}
