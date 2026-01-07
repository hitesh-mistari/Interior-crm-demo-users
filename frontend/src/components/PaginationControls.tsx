import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    totalItems: number;
    onItemsPerPageChange?: (items: number) => void;
}

export default function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    totalItems,
    onItemsPerPageChange
}: PaginationControlsProps) {
    if (totalPages <= 1 && totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-slate-200 mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </span>
                {onItemsPerPageChange && (
                    <select
                        value={itemsPerPage}
                        onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                        className="ml-2 border border-slate-300 rounded px-2 py-1 text-xs focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous Page"
                >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Logic to show a window of pages around current page
                        let p = i + 1;
                        if (totalPages > 5) {
                            if (currentPage > 3) {
                                p = currentPage - 2 + i;
                            }
                            if (p > totalPages) {
                                p = totalPages - (4 - i);
                            }
                        }

                        return (
                            <button
                                key={p}
                                onClick={() => onPageChange(p)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === p
                                        ? 'bg-slate-800 text-white'
                                        : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {p}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next Page"
                >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
            </div>
        </div>
    );
}
