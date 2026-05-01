import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Loader2, CheckCircle2, Brain, Database, Scale, AlertTriangle, FileText, XCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { predictImage } from '../services/api';
import { useAnalysis } from '../context/AnalysisContext';

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

const PIPELINE_STEPS = [
    { id: 'upload', label: 'Image Upload', icon: UploadCloud },
    { id: 'cnn', label: 'CNN Inference', icon: Brain },
    { id: 'retrieval', label: 'FAISS Retrieval', icon: Database },
    { id: 'weighting', label: 'Evidence Weighting', icon: Scale },
    { id: 'disagreement', label: 'Disagreement Check', icon: AlertTriangle },
    { id: 'generation', label: 'Report Generation', icon: FileText },
];

export default function Upload() {
    const { result, setResult, clearResult, setIsAnalyzing } = useAnalysis();

    // If there's an existing result, start in 'complete' state
    const [state, setState] = useState<AnalysisState>(result ? 'complete' : 'idle');
    const [currentStep, setCurrentStep] = useState(result ? PIPELINE_STEPS.length : 0);
    const [isDragOver, setIsDragOver] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Sync state if result changes externally (e.g. loading from history)
    useEffect(() => {
        if (result) {
            setState('complete');
            setCurrentStep(PIPELINE_STEPS.length);
        }
    }, [result]);

    const runAnalysis = useCallback(async (file: File) => {
        // Create preview
        setPreviewUrl(URL.createObjectURL(file));
        setState('uploading');
        setIsAnalyzing(true);
        setCurrentStep(0);
        setErrorMessage('');

        // Simulate pipeline steps visually while the API call runs
        const stepPromise = new Promise<void>((resolve) => {
            let step = 0;
            const interval = setInterval(() => {
                step++;
                if (step < PIPELINE_STEPS.length) {
                    setCurrentStep(step);
                } else {
                    clearInterval(interval);
                    resolve();
                }
            }, 1500);

            // Start analyzing after first step
            setTimeout(() => setState('analyzing'), 800);
        });

        try {
            // Run API call and step animation in parallel
            const [apiResult] = await Promise.all([
                predictImage(file),
                stepPromise,
            ]);

            // Ensure we show all steps complete
            setCurrentStep(PIPELINE_STEPS.length);
            setResult(apiResult);
            setState('complete');
        } catch (err: any) {
            setErrorMessage(err.message || 'Analysis failed. Please try again.');
            setState('error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [setResult, setIsAnalyzing]);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setErrorMessage('Please upload a valid image file (JPEG, PNG).');
            setState('error');
            return;
        }
        runAnalysis(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleClick = () => {
        if (state === 'idle' || state === 'error') {
            fileInputRef.current?.click();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const resetAnalysis = () => {
        setState('idle');
        setCurrentStep(0);
        setPreviewUrl(null);
        setErrorMessage('');
        clearResult();
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Upload & Analysis</h2>
                    <p className="text-gray-400 mt-1">Upload a chest X-ray image to generate an evidence-grounded report.</p>
                </div>
                {state === 'complete' && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={resetAnalysis}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all"
                    >
                        <RotateCcw className="w-4 h-4" />
                        New Analysis
                    </motion.button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
                id="xray-file-input"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Zone */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`
                          relative overflow-hidden rounded-3xl border-2 border-dashed p-12 text-center transition-all duration-300
                          ${isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'}
                          ${state !== 'idle' && state !== 'error' ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        `}
                        onClick={handleClick}
                    >
                        <AnimatePresence mode="wait">
                            {state === 'idle' && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="space-y-4"
                                >
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                                        <UploadCloud className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium text-white">Drop your X-ray image here</p>
                                        <p className="text-sm text-gray-500 mt-1">or click to select a file (PNG, JPG)</p>
                                    </div>
                                </motion.div>
                            )}
                            {(state === 'uploading' || state === 'analyzing') && (
                                <motion.div
                                    key="processing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-4"
                                >
                                    {previewUrl && (
                                        <img src={previewUrl} alt="Uploaded X-ray" className="w-32 h-32 mx-auto rounded-xl object-cover border border-white/10 mb-4" />
                                    )}
                                    <Loader2 className="w-12 h-12 text-indigo-400 mx-auto animate-spin" />
                                    <p className="text-white font-medium">
                                        {state === 'uploading' ? 'Uploading image...' : `Running: ${PIPELINE_STEPS[currentStep]?.label || 'Processing...'}`}
                                    </p>
                                </motion.div>
                            )}
                            {state === 'complete' && (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="space-y-4"
                                >
                                    {previewUrl && (
                                        <img src={previewUrl} alt="Analyzed X-ray" className="w-32 h-32 mx-auto rounded-xl object-cover border-2 border-emerald-500/30 mb-4" />
                                    )}
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <p className="text-lg font-medium text-emerald-400">Analysis Complete!</p>
                                    <p className="text-sm text-gray-500">Results are saved. Navigate freely — your analysis will persist.</p>
                                </motion.div>
                            )}
                            {state === 'error' && (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="space-y-4"
                                >
                                    <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center">
                                        <XCircle className="w-8 h-8 text-red-400" />
                                    </div>
                                    <p className="text-lg font-medium text-red-400">Analysis Failed</p>
                                    <p className="text-sm text-gray-400">{errorMessage}</p>
                                    <p className="text-xs text-gray-500">Click to try again with a different image</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {state === 'error' && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={resetAnalysis}
                            className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            Try Again
                        </motion.button>
                    )}
                </motion.div>

                {/* Pipeline Visualization */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-6">Analysis Pipeline</h3>
                    <div className="space-y-4">
                        {PIPELINE_STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = (state === 'analyzing' || state === 'uploading') && currentStep === index;
                            const isComplete = state === 'analyzing' ? currentStep > index : (state === 'complete' && currentStep >= PIPELINE_STEPS.length);

                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`
                                      flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                                      ${isActive ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : ''}
                                      ${isComplete ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                                      ${!isActive && !isComplete ? 'bg-white/5 border-white/10' : ''}
                                    `}
                                >
                                    <div className={`
                                      w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                                      ${isActive ? 'bg-indigo-500/30' : ''}
                                      ${isComplete ? 'bg-emerald-500/30' : ''}
                                      ${!isActive && !isComplete ? 'bg-white/10' : ''}
                                    `}>
                                        {isActive ? (
                                            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                                        ) : isComplete ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                        ) : (
                                            <Icon className="w-5 h-5 text-gray-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-medium ${isActive ? 'text-indigo-300' : isComplete ? 'text-emerald-300' : 'text-gray-400'}`}>
                                            {step.label}
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Results Preview (shown on complete) */}
            <AnimatePresence>
                {state === 'complete' && (
                    <ResultsPreview navigate={navigate} />
                )}
            </AnimatePresence>
        </div>
    );
}

function ResultsPreview({ navigate }: { navigate: (path: string) => void }) {
    const { result } = useAnalysis();

    if (!result) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="space-y-6"
        >
            {/* Prediction Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prediction</p>
                    <p className="text-2xl font-bold text-white">{result.prediction}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
                    <p className="text-2xl font-bold text-emerald-400">{(result.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className={`backdrop-blur-md border rounded-2xl p-5 ${result.disagreement ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Evidence Agreement</p>
                    <p className={`text-2xl font-bold ${result.disagreement ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {result.disagreement ? '⚠️ Disagreement' : '✓ Consensus'}
                    </p>
                </div>
            </div>

            {/* Report Preview */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Generated Report Preview</h3>
                <div className="bg-black/30 rounded-xl p-6 font-mono text-sm text-indigo-100/80 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {result.report}
                </div>
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={() => navigate('/reports')}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all"
                    >
                        View Full Report
                    </button>
                    <button
                        onClick={() => navigate('/evidence')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-sm transition-all"
                    >
                        View Evidence ({result.evidence.length} cases)
                    </button>
                    <button
                        onClick={() => navigate('/disagreement')}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium text-sm transition-all"
                    >
                        Disagreement Analysis
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
