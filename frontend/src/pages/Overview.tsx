import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, FileCheck, AlertCircle, ArrowRight, Brain, Database, Scale, FileText, UploadCloud } from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';

export default function Overview() {
    const { result } = useAnalysis();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Overview</h2>
                    <p className="text-gray-400 mt-1">Evidence-weighted, disagreement-aware chest X-ray analysis.</p>
                </div>
                <Link to="/upload" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center gap-2">
                    New Analysis <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Metrics Grid — show real data if analysis done */}
            {result ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Prediction" value={result.prediction} icon={Brain} delay={0.1} />
                    <MetricCard title="Confidence" value={`${(result.confidence * 100).toFixed(1)}%`} icon={Activity} delay={0.2} />
                    <MetricCard title="Evidence Cases" value={`${result.evidence.length}`} icon={FileCheck} delay={0.3} />
                    <MetricCard
                        title="Agreement"
                        value={result.disagreement ? 'Disagreement' : 'Consensus'}
                        icon={AlertCircle}
                        delay={0.4}
                        warning={result.disagreement}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Prediction" value="—" icon={Brain} delay={0.1} />
                    <MetricCard title="Confidence" value="—" icon={Activity} delay={0.2} />
                    <MetricCard title="Evidence Cases" value="—" icon={FileCheck} delay={0.3} />
                    <MetricCard title="Agreement" value="—" icon={AlertCircle} delay={0.4} />
                </div>
            )}

            {/* Pipeline Visualization */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="lg:col-span-2 bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6 min-h-[300px]"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">System Pipeline</h3>
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                    </div>

                    {/* Pipeline Visual */}
                    <div className="relative pt-8 pb-4">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
                        <div className="flex justify-between relative z-10">
                            {[
                                { label: 'Upload', icon: UploadCloud },
                                { label: 'CNN', icon: Brain },
                                { label: 'FAISS', icon: Database },
                                { label: 'Weighting', icon: Scale },
                                { label: 'Disagreement', icon: AlertCircle },
                                { label: 'Report', icon: FileText },
                            ].map((step, i) => (
                                <motion.div
                                    key={step.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 + i * 0.1 }}
                                    className="flex flex-col items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                        <step.icon className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-xs text-gray-400 font-medium">{step.label}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-black/20 rounded-xl border border-white/5">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            <span className="text-indigo-400 font-semibold">Pipeline:</span>{' '}
                            Upload chest X-ray → DenseNet-121 CNN inference → FAISS similarity retrieval →
                            Evidence weighting (similarity × confidence) → Disagreement detection & pruning →
                            Gemini-powered report generation.
                        </p>
                    </div>
                </motion.div>

                {/* Latest Report Preview */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="bg-white/[0.03] backdrop-blur-md border border-white/5 rounded-3xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-4">Latest Report</h3>
                    {result ? (
                        <div className="space-y-4">
                            <div className="p-4 bg-black/40 rounded-xl border border-white/5 font-mono text-sm text-indigo-100/80 leading-relaxed max-h-48 overflow-y-auto">
                                <p>{result.report.substring(0, 300)}{result.report.length > 300 ? '...' : ''}</p>
                            </div>
                            <Link
                                to="/reports"
                                className="block w-full text-center py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 transition-all"
                            >
                                View Full Report →
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <FileText className="w-12 h-12 text-gray-600 mb-4" />
                            <p className="text-gray-500 text-sm">No report generated yet.<br />Upload an X-ray to get started.</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, delay, warning }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="bg-white/[0.03] backdrop-blur-md border border-white/5 p-5 rounded-2xl hover:border-indigo-500/30 transition-all hover:bg-white/[0.05] group"
        >
            <div className="flex justify-between items-start mb-4">
                <div className="p-2.5 bg-white/5 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
                    <Icon className={`w-5 h-5 ${warning ? 'text-amber-400' : 'text-gray-400 group-hover:text-indigo-400'}`} />
                </div>
            </div>
            <div className="space-y-1">
                <h3 className={`text-2xl font-bold tracking-tight ${warning ? 'text-amber-400' : 'text-white'}`}>{value}</h3>
                <p className="text-sm text-gray-400 font-medium">{title}</p>
            </div>
        </motion.div>
    );
}
