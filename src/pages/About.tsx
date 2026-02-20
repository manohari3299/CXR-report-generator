import { motion } from 'framer-motion';
import { Brain, Target, Lightbulb, Users, BookOpen, ExternalLink, Github, Mail } from 'lucide-react';

import kiranAvatar from '../assets/kiran.png';
import aryanAvatar from '../assets/aryan.jpeg';
import renukaAvatar from '../assets/renuka.png';

const teamMembers = [
    { name: 'Kiran Krishna', role: 'ML & Backend', avatar: kiranAvatar },
    { name: 'Aryan Aligeti', role: 'Frontend & UI', avatar: aryanAvatar },
    { name: 'Renuka Manohari', role: 'Research & Data', avatar: renukaAvatar },
];

const features = [
    {
        icon: Brain,
        title: 'CNN-Based Classification',
        description: 'Deep learning model trained on chest X-ray datasets for multi-label classification.',
    },
    {
        icon: Target,
        title: 'Evidence Weighting',
        description: 'Retrieved cases are weighted by similarity × confidence, ensuring high-quality evidence.',
    },
    {
        icon: Lightbulb,
        title: 'Disagreement Detection',
        description: 'Automatically identifies and handles conflicting evidence before report generation.',
    },
];

const references = [
    { title: 'CheXpert Dataset', url: 'https://stanfordmlgroup.github.io/competitions/chexpert/' },
    { title: 'MIMIC-CXR Database', url: 'https://physionet.org/content/mimic-cxr/' },
    { title: 'FAISS: A Library for Efficient Similarity Search', url: 'https://github.com/facebookresearch/faiss' },
];

export default function About() {
    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
            >
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                    <Brain className="w-4 h-4" />
                    Major Project 2025-26
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight mb-4">
                    Evidence-Weighted, Disagreement-Aware<br />
                    <span className="text-indigo-400">Chest X-Ray Report Generation</span>
                </h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                    An AI system that generates radiology reports grounded in similar retrieved cases,
                    with intelligent handling of conflicting evidence.
                </p>
            </motion.div>

            {/* Problem & Objective */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-rose-300 mb-3">The Problem</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Traditional retrieval-augmented report generation treats all retrieved cases equally.
                        This leads to inconsistent reports when evidence conflicts, and fails to account for
                        varying confidence levels across cases.
                    </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-emerald-300 mb-3">Our Solution</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        We introduce evidence weighting based on similarity and CNN confidence, combined with
                        disagreement detection that prunes conflicting cases before report generation,
                        resulting in more reliable and clinically grounded outputs.
                    </p>
                </div>
            </motion.div>

            {/* Key Features */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <h2 className="text-2xl font-bold text-white mb-6">Key Innovations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.1 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-indigo-500/30 transition-all"
                        >
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                                <feature.icon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                            <p className="text-sm text-gray-400">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Team */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-6">
                    <Users className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Team</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {teamMembers.map((member, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
                            <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30"
                            />
                            <div>
                                <p className="font-medium text-white">{member.name}</p>
                                <p className="text-sm text-gray-400">{member.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-sm text-gray-400">
                        <span className="font-medium text-white">Project Guide:</span> Prof. Ashok Kumar, Department of IDK
                    </p>
                </div>
            </motion.div>

            {/* References */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">References</h2>
                </div>
                <div className="space-y-2">
                    {references.map((ref, i) => (
                        <a
                            key={i}
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                        >
                            <span className="text-sm text-gray-300 group-hover:text-white">{ref.title}</span>
                            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-indigo-400" />
                        </a>
                    ))}
                </div>
            </motion.div>

            {/* Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center py-8 border-t border-white/10"
            >
                <p className="text-gray-500 text-sm">
                    © Xray Report Generator | Built with React, TypeScript, and TailwindCSS
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        <Github className="w-5 h-5" />
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors">
                        <Mail className="w-5 h-5" />
                    </a>
                </div>
            </motion.div>
        </div>
    );
}
