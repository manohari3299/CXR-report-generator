import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useState, useMemo } from 'react';
import { AlertTriangle, Scale, Trash2, RotateCcw, CheckCircle, XCircle, Info, Brain, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { useAnalysis } from '../context/AnalysisContext';
import { Link } from 'react-router-dom';
import type { EvidenceCase } from '../types';

const alignmentConfig = {
    supports: { label: 'Supports', color: 'emerald', Icon: ShieldCheck },
    conflicts: { label: 'Conflicts', color: 'red', Icon: ShieldAlert },
    neutral: { label: 'Neutral', color: 'gray', Icon: ShieldQuestion },
};

function MiniEvidenceCard({ caseData, isPruned }: { caseData: EvidenceCase; isPruned: boolean }) {
    const align = alignmentConfig[caseData.alignment] || alignmentConfig.neutral;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isPruned ? 0.3 : 1, scale: isPruned ? 0.95 : 1 }}
            exit={{ opacity: 0, scale: 0.8, x: -50 }}
            transition={{ duration: 0.3 }}
            className={`relative p-4 rounded-xl border transition-all ${isPruned ? 'bg-red-900/10 border-red-500/20' : 'bg-white/5 border-white/10 hover:border-indigo-500/30'}`}
        >
            {isPruned && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <XCircle className="w-6 h-6 text-red-400" />
                </div>
            )}
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-500">Case #{caseData.rank}</span>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        caseData.label === 'Normal' ? 'bg-emerald-500/20 text-emerald-400' :
                        caseData.alignment === 'conflicts' ? 'bg-red-500/20 text-red-400' :
                        caseData.alignment === 'supports' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-amber-500/20 text-amber-400'
                    }`}>
                        {caseData.label}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-${align.color}-500/10 text-${align.color}-400 border border-${align.color}-500/20`}>
                        {align.label}
                    </span>
                </div>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Weight</span>
                    <span className={`font-semibold ${isPruned ? 'text-red-400' : 'text-indigo-400'}`}>{(caseData.weight * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all ${isPruned ? 'bg-red-500/50' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                        style={{ width: `${caseData.weight * 100}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Disagreement: {(caseData.disagreement_score * 100).toFixed(0)}%</span>
                    <span>Similarity: {(caseData.similarity * 100).toFixed(0)}%</span>
                </div>
            </div>
        </motion.div>
    );
}

export default function Disagreement() {
    const { result } = useAnalysis();
    const [threshold, setThreshold] = useState(0.5);
    const [hasPruned, setHasPruned] = useState(false);

    const evidence = result?.evidence || [];

    const { pruned, stats } = useMemo(() => {
        const keptCases: EvidenceCase[] = [];
        const prunedCases: EvidenceCase[] = [];

        evidence.forEach(c => {
            if (c.weight >= threshold && c.disagreement_score < 0.5) {
                keptCases.push(c);
            } else {
                prunedCases.push(c);
            }
        });

        // Count how many kept cases support the CNN prediction
        const supporting = keptCases.filter(c => c.alignment === 'supports').length;
        const conflicting = keptCases.filter(c => c.alignment === 'conflicts').length;
        const neutral = keptCases.filter(c => c.alignment === 'neutral').length;
        const agreementRatio = keptCases.length > 0 ? supporting / keptCases.length : 0;

        return {
            kept: keptCases,
            pruned: prunedCases,
            stats: { supporting, conflicting, neutral, agreementRatio, totalKept: keptCases.length, totalPruned: prunedCases.length }
        };
    }, [evidence, threshold]);

    const handlePrune = () => {
        setHasPruned(true);
    };

    const handleReset = () => {
        setHasPruned(false);
        setThreshold(0.5);
    };

    // Empty state
    if (!result) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Disagreement Resolution</h2>
                    <p className="text-gray-400 mt-1">Simulate evidence pruning to resolve conflicts and build consensus.</p>
                </div>
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10 text-amber-400/50" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Analysis Results</h3>
                    <p className="text-gray-400 mb-6 max-w-md">
                        Upload and analyze a chest X-ray first to explore disagreement resolution.
                    </p>
                    <Link
                        to="/upload"
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-all"
                    >
                        Go to Upload
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Disagreement Resolution</h2>
                <p className="text-gray-400 mt-1">
                    Evidence alignment for CNN prediction: <span className="text-indigo-400 font-semibold">{result.prediction}</span>
                    <span className="text-gray-500 ml-2">({(result.confidence * 100).toFixed(1)}% confidence)</span>
                    {result.disagreement && <span className="text-amber-400 ml-2">⚠️ Disagreement detected</span>}
                </p>
            </div>

            {/* CNN Prediction Anchor Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5"
            >
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <Brain className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">CNN Prediction (Authoritative Diagnosis)</h4>
                        <p className="text-2xl font-bold text-indigo-300">{result.prediction}</p>
                        <p className="text-sm text-indigo-200/60 mt-1">
                            All evidence cases below are evaluated relative to this CNN prediction.
                            Cases that agree are marked <span className="text-emerald-400 font-medium">Supports</span>,
                            those with different findings are marked <span className="text-red-400 font-medium">Conflicts</span>,
                            and unclear cases are <span className="text-gray-400 font-medium">Neutral</span>.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Explanation Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5"
            >
                <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-indigo-300 mb-1">How This Works</h4>
                        <p className="text-sm text-indigo-200/70 leading-relaxed">
                            The system retrieves similar cases from a database of 66,000+ reports. Some retrieved cases may mention
                            different conditions than what the CNN detected. By pruning low-weight and conflicting evidence,
                            we ensure the generated report reflects a confident consensus aligned with the CNN prediction.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-400" />
                    Weight Threshold
                </h3>

                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={threshold}
                            onChange={(e) => setThreshold(parseFloat(e.target.value))}
                            disabled={hasPruned}
                            className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
                        />
                        <span className="text-2xl font-bold text-indigo-400 w-20 text-right">{(threshold * 100).toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Keep all cases (0%)</span>
                        <span>Strict filtering (100%)</span>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handlePrune}
                            disabled={hasPruned}
                            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 font-medium hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 className="w-4 h-4" />
                            Prune Weak Evidence
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleReset}
                            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 font-medium hover:bg-white/10 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </motion.button>
                    </div>
                </div>
            </motion.div>

            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Before */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Evidence Pool</h3>
                        <span className="text-sm text-gray-400">{evidence.length} cases</span>
                    </div>
                    <LayoutGroup>
                        <div className="grid grid-cols-1 gap-3">
                            <AnimatePresence mode="popLayout">
                                {evidence.map(c => (
                                    <MiniEvidenceCard
                                        key={c.rank}
                                        caseData={c}
                                        isPruned={hasPruned && pruned.some(p => p.rank === c.rank)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </LayoutGroup>
                </motion.div>

                {/* After */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Consensus Analysis</h3>
                        <span className={`text-sm ${hasPruned ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {hasPruned ? `${stats.totalKept} retained` : 'Awaiting pruning'}
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        {hasPruned ? (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                        <span className="font-semibold text-emerald-300">
                                            {stats.agreementRatio >= 0.5 ? 'Consensus Supports CNN' : 'Weak Consensus'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-emerald-200/70">
                                        CNN Prediction: <span className="font-semibold text-white">{result.prediction}</span>
                                    </p>
                                    <p className="text-sm text-emerald-200/70">
                                        Evidence agreement: <span className="font-semibold text-white">{(stats.agreementRatio * 100).toFixed(0)}%</span> of retained cases support this diagnosis
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-emerald-400">{stats.supporting}</p>
                                        <p className="text-xs text-emerald-300/70">Supporting</p>
                                    </div>
                                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-gray-400">{stats.neutral}</p>
                                        <p className="text-xs text-gray-300/70">Neutral</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-red-400">{stats.conflicting}</p>
                                        <p className="text-xs text-red-300/70">Conflicting</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-emerald-400">{stats.totalKept}</p>
                                        <p className="text-xs text-emerald-300/70">Cases Retained</p>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-red-400">{stats.totalPruned}</p>
                                        <p className="text-xs text-red-300/70">Cases Pruned</p>
                                    </div>
                                </div>

                                <div className="bg-black/30 rounded-xl p-4">
                                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                                        <span className="text-indigo-400">Summary:</span> Based on {stats.totalKept} retained
                                        evidence cases, {stats.supporting} support the CNN diagnosis of <span className="text-white font-semibold">{result.prediction}</span>.
                                        {stats.conflicting > 0 && ` ${stats.conflicting} case(s) suggest alternative findings — clinical correlation advised.`}
                                        {stats.conflicting === 0 && ' No conflicting evidence remains after pruning.'}
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-12 text-gray-500"
                            >
                                <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                                <p className="text-center">Adjust the threshold and click "Prune" to see consensus results</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
