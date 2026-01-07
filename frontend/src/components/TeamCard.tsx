import React from 'react';
import { formatCurrency } from '../utils/formatters';
import { Trash2 } from 'lucide-react';

interface TeamCardProps {
    member: {
        id: string;
        name: string;
        photoUrl?: string;
        skills?: string[];
        employmentStatus?: string;
        totalWorkValue: number;
        totalPaid: number;
        pendingAmount: number;
        contact?: string;
    };
    onClick: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const TeamCard: React.FC<TeamCardProps> = ({ member, onClick, onEdit, onDelete }) => {
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const isFullTime = member.employmentStatus === 'Full-Time';

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full group"
        >
            {/* Header: Avatar + Info + Actions */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3 items-center flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-12 h-12 shrink-0 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center">
                        {member.photoUrl ? (
                            <img
                                src={member.photoUrl}
                                alt={member.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className={`text-lg font-bold ${isFullTime ? 'text-emerald-700' : 'text-slate-600'}`}>
                                {getInitials(member.name)}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                            {member.name}
                        </h3>
                        {Array.isArray(member.skills) && member.skills.length > 0 && (
                            <div className="text-sm text-slate-500 truncate">
                                {member.skills.join(', ')}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1 ml-2">
                        {onEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit();
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                                title="Edit Member"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete();
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Delete Member"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Body: Stats List */}
            <div className="space-y-3 mb-6 flex-1">
                {/* Skills (optional, if space permits, or just keep cleaner stats) 
                <div className="text-sm text-slate-600 flex items-center gap-2">
                    <Hammer className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{Array.isArray(member.skills) && member.skills.length > 0 ? member.skills.join(', ') : 'No skills listed'}</span>
                </div>
                */}

                <div className="flex flex-col gap-2">
                    <div className="text-sm flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                        <span className="text-slate-600">Total Work:</span>
                        <span className="text-slate-900 font-medium">{formatCurrency(member.totalWorkValue)}</span>
                    </div>
                    <div className="text-sm flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                        <span className="text-slate-600">Paid Amount:</span>
                        <span className="text-emerald-600 font-medium">{formatCurrency(member.totalPaid)}</span>
                    </div>
                    <div className="text-sm flex justify-between items-center">
                        <span className="text-slate-600">Pending:</span>
                        <span className={`font-bold ${member.pendingAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {formatCurrency(member.pendingAmount)}
                        </span>
                    </div>
                </div>


            </div>
            {/* Ledger Button */}
            <div className="kee pt-4 border-t border-slate-100">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm hover:shadow"
                >
                    View Ledger
                </button>
            </div>
        </div>
    );
};

export default TeamCard;
