"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFinalReport = exports.generateSamplingReport = exports.finalizeSampling = exports.validateStepData = exports.checkCompliance = exports.deleteOIT = exports.updateOIT = exports.reanalyzeOIT = exports.createOITAsync = exports.createOIT = exports.getOITById = exports.getAllOITs = exports.getAssignedEngineers = exports.assignEngineers = exports.uploadLabResults = exports.getSamplingData = exports.saveSamplingData = exports.rejectPlanning = exports.acceptPlanning = void 0;
const client_1 = require("@prisma/client");
const ai_service_1 = require("../services/ai.service");
const aiService = new ai_service_1.AIService();
const notification_controller_1 = require("./notification.controller");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
// Accept Planning Proposal
const acceptPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const { templateId } = req.body;
        // Get OIT with aiData to extract assigned resources
        const existingOit = yield prisma.oIT.findUnique({ where: { id } });
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                planningAccepted: true,
                selectedTemplateIds: templateId ? JSON.stringify([templateId]) : null,
                status: 'SCHEDULED'
            }
        });
        // Update resource statuses if there are assigned resources
        if (existingOit === null || existingOit === void 0 ? void 0 : existingOit.aiData) {
            try {
                const aiData = JSON.parse(existingOit.aiData);
                if (((_a = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _a === void 0 ? void 0 : _a.assignedResources) && Array.isArray(aiData.data.assignedResources)) {
                    // Update each resource status to IN_USE
                    for (const resource of aiData.data.assignedResources) {
                        if (resource.id) {
                            yield prisma.resource.update({
                                where: { id: resource.id },
                                data: { status: 'IN_USE' }
                            });
                            console.log(`Resource ${resource.name} set to IN_USE for OIT ${oit.oitNumber}`);
                        }
                    }
                }
            }
            catch (parseError) {
                console.error('Error parsing aiData for resource updates:', parseError);
                // Continue even if resource update fails
            }
        }
        // Create notification
        if ((_b = req.user) === null || _b === void 0 ? void 0 : _b.userId) {
            yield prisma.notification.create({
                data: {
                    userId: req.user.userId,
                    oitId: id,
                    title: 'Planeación Aceptada',
                    message: `La propuesta de planeación para OIT ${oit.oitNumber} ha sido aceptada. Recursos asignados y programados.`,
                    type: 'SUCCESS'
                }
            });
        }
        res.json(oit);
    }
    catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
});
exports.acceptPlanning = acceptPlanning;
// Reject Planning Proposal
const rejectPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                planningProposal: null,
                planningAccepted: false
            }
        });
        res.json({ message: 'Propuesta rechazada, puede crear una planeación manual', oit });
    }
    catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
});
exports.rejectPlanning = rejectPlanning;
// Save Sampling Data
const saveSamplingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const samplingData = req.body;
        const isComplete = !samplingData.partial && samplingData.completedAt;
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                samplingData: JSON.stringify(samplingData),
                status: isComplete ? 'IN_PROGRESS' : 'SCHEDULED',
                pendingSync: false
            }
        });
        // Create notification if completed
        if (isComplete && ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId)) {
            yield prisma.notification.create({
                data: {
                    userId: req.user.userId,
                    oitId: id,
                    title: 'Muestreo Completado',
                    message: `El muestreo para OIT ${oit.oitNumber} ha sido completado`,
                    type: 'SUCCESS'
                }
            });
        }
        res.json({ success: true, oit });
    }
    catch (error) {
        console.error('Error saving sampling data:', error);
        res.status(500).json({ error: 'Error al guardar datos de muestreo' });
    }
});
exports.saveSamplingData = saveSamplingData;
// Get Sampling Data
const getSamplingData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit || !oit.samplingData) {
            return res.status(404).json({ error: 'No hay datos de muestreo' });
        }
        res.json(JSON.parse(oit.samplingData));
    }
    catch (error) {
        console.error('Error getting sampling data:', error);
        res.status(500).json({ error: 'Error al obtener datos de muestreo' });
    }
});
exports.getSamplingData = getSamplingData;
// Upload Lab Results
// Upload Lab Results
const uploadLabResults = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }
        // 1. Return immediate response and set status to ANALYZING
        const oit = yield prisma.oIT.update({
            where: { id },
            data: {
                labResultsUrl: file.path,
                labResultsAnalysis: null, // Clear previous analysis
                status: 'ANALYZING'
            }
        });
        res.json({
            success: true,
            labResultsUrl: file.path,
            status: 'ANALYZING',
            message: 'Resultados subidos. Análisis en curso...'
        });
        // 2. Trigger asynchronous processing
        processLabResultsAsync(id, file.path).catch(err => {
            console.error('Error in background lab processing:', err);
        });
    }
    catch (error) {
        console.error('Error uploading lab results:', error);
        res.status(500).json({ error: 'Error al subir resultados de laboratorio' });
    }
});
exports.uploadLabResults = uploadLabResults;
// Background Processor for Lab Results
function processLabResultsAsync(oitId, filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`Starting background lab analysis for OIT ${oitId}`);
            const { pdfService } = require('../services/pdf.service');
            let extractedText = '';
            try {
                if (filePath.endsWith('.pdf')) {
                    extractedText = yield pdfService.extractText(filePath);
                }
                else {
                    extractedText = fs_1.default.readFileSync(filePath, 'utf-8');
                }
            }
            catch (readErr) {
                console.error("Error extracting text from lab file:", readErr);
                extractedText = "Error al leer documento de laboratorio.";
            }
            // Get OIT Context for better analysis
            const oit = yield prisma.oIT.findUnique({ where: { id: oitId } });
            const oitContext = (oit === null || oit === void 0 ? void 0 : oit.description) || '';
            // Analyze with AI - Now returns text
            const analysis = yield aiService.analyzeLabResults(extractedText || "Texto no extraído", oitContext);
            // Update OIT with results - Save as plain text
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    labResultsAnalysis: analysis, // Save as text, not JSON
                    status: analysis.includes('Error') ? 'REVIEW_NEEDED' : 'COMPLETED'
                }
            });
            console.log(`Lab analysis completed for OIT ${oitId}`);
        }
        catch (error) {
            console.error('Background lab analysis failed:', error);
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    labResultsAnalysis: "Error interno al procesar resultados. Por favor, revise el documento manualmente.",
                    status: 'REVIEW_NEEDED'
                }
            });
        }
    });
}
// Generate Final Report
// Assign Engineers to OIT
const assignEngineers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { engineerIds } = req.body; // Array of user IDs
        if (!Array.isArray(engineerIds)) {
            return res.status(400).json({ error: 'engineerIds debe ser un array' });
        }
        // Verify OIT exists
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Remove existing assignments
        yield prisma.oITAssignment.deleteMany({
            where: { oitId: id }
        });
        // Create new assignments
        if (engineerIds.length > 0) {
            yield prisma.oITAssignment.createMany({
                data: engineerIds.map((userId) => ({
                    oitId: id,
                    userId
                }))
            });
        }
        // Get updated OIT with assignments
        const updatedOit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        res.json({
            success: true,
            assignedEngineers: (updatedOit === null || updatedOit === void 0 ? void 0 : updatedOit.assignedEngineers.map((a) => a.user)) || []
        });
    }
    catch (error) {
        console.error('Error assigning engineers:', error);
        res.status(500).json({ error: 'Error al asignar ingenieros' });
    }
});
exports.assignEngineers = assignEngineers;
// Get assigned engineers for an OIT
const getAssignedEngineers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const assignments = yield prisma.oITAssignment.findMany({
            where: { oitId: id },
            include: {
                user: {
                    select: { id: true, name: true, email: true, role: true }
                }
            }
        });
        res.json(assignments.map((a) => a.user));
    }
    catch (error) {
        console.error('Error getting assigned engineers:', error);
        res.status(500).json({ error: 'Error al obtener ingenieros asignados' });
    }
});
exports.getAssignedEngineers = getAssignedEngineers;
// Get all OIT records (filtered by role)
const getAllOITs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const userRole = user === null || user === void 0 ? void 0 : user.role;
        const userId = user === null || user === void 0 ? void 0 : user.userId;
        // If user is ENGINEER, only show OITs assigned to them
        let whereClause = {};
        if (userRole === 'ENGINEER' && userId) {
            whereClause = {
                assignedEngineers: {
                    some: {
                        userId: userId
                    }
                }
            };
        }
        const oits = yield prisma.oIT.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        // Map to include engineers in a cleaner format
        const result = oits.map((oit) => (Object.assign(Object.assign({}, oit), { engineers: oit.assignedEngineers.map((a) => a.user) })));
        res.status(200).json(result);
    }
    catch (error) {
        console.error('Error in getAllOITs:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
});
exports.getAllOITs = getAllOITs;
// Get a single OIT by ID
const getOITById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = req.user;
        const oit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        if (!oit) {
            return res.status(404).json({ message: 'OIT not found' });
        }
        // If user is ENGINEER, check if they are assigned
        if ((user === null || user === void 0 ? void 0 : user.role) === 'ENGINEER') {
            const isAssigned = oit.assignedEngineers.some((a) => a.userId === user.userId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'No tienes acceso a esta OIT' });
            }
        }
        res.status(200).json(Object.assign(Object.assign({}, oit), { engineers: oit.assignedEngineers.map((a) => a.user) }));
    }
    catch (error) {
        console.error('Error in getOITById:', error);
        res.status(500).json({ message: 'Something went wrong', error: String(error) });
    }
});
exports.getOITById = getOITById;
/* Existing createOIT (JSON) kept for backward compatibility */
const createOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { oitNumber, description, status } = req.body;
        const oit = yield prisma.oIT.create({
            data: {
                oitNumber: oitNumber || '',
                description: description || '',
                status: status || 'PENDING',
            },
        });
        res.status(201).json(oit);
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.createOIT = createOIT;
// Async creation endpoint that accepts file uploads and triggers background AI processing
const createOITAsync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { oitNumber, description } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId; // Cast req to any to access user property
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        // Generate oitNumber if not provided
        const finalOitNumber = oitNumber || `OIT-${Date.now()}`;
        // Create OIT with UPLOADING status
        const oit = yield prisma.oIT.create({
            data: {
                oitNumber: finalOitNumber,
                description: description || 'Análisis en curso...',
                status: 'UPLOADING'
            }
        });
        // Send immediate response
        res.json({
            id: oit.id,
            oitNumber: oit.oitNumber,
            status: 'UPLOADING',
            message: 'OIT creada. Procesando archivos en segundo plano...'
        });
        // Process files asynchronously
        processOITFilesAsync(oit.id, req.files, userId).catch(err => {
            console.error('Error processing OIT files:', err);
        });
    }
    catch (error) {
        console.error('Error creating OIT:', error);
        res.status(500).json({ error: 'Error al crear OIT' });
    }
});
exports.createOITAsync = createOITAsync;
// Separated Analysis Logic
function runOITAnalysis(oitId, oitFilePath, quotationFilePath, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { complianceService } = yield Promise.resolve().then(() => __importStar(require('../services/compliance.service')));
            const { default: planningService } = yield Promise.resolve().then(() => __importStar(require('../services/planning.service')));
            yield prisma.oIT.update({
                where: { id: oitId },
                data: { status: 'ANALYZING' }
            });
            const aiDataContent = {};
            let extractedDescription = null;
            let extractedLocation = null;
            // Analyze OIT File
            if (oitFilePath && fs_1.default.existsSync(oitFilePath)) {
                const pdfParse = (yield Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
                const dataBuffer = yield fs_1.default.promises.readFile(oitFilePath);
                const pdfData = yield pdfParse(dataBuffer);
                const oitText = pdfData.text;
                const oitAnalysis = yield aiService.analyzeDocument(oitText);
                aiDataContent.oit = oitAnalysis;
                // Extract description
                if (oitAnalysis.description) {
                    extractedDescription = oitAnalysis.description;
                }
                else if (oitText.length > 50) {
                    extractedDescription = oitText.substring(0, 200).trim() + '...';
                }
                // Extract location from analysis
                if (oitAnalysis.location) {
                    extractedLocation = oitAnalysis.location;
                }
                else {
                    // Fallback: search for common location keywords
                    const locationMatch = oitText.match(/(?:Dirección|Ubicación|Lugar|Sitio|Dirección del sitio)[:\s]+([^\n.]{10,150})/i);
                    if (locationMatch) {
                        extractedLocation = locationMatch[1].trim();
                    }
                }
            }
            // Analyze Quotation File
            if (quotationFilePath && fs_1.default.existsSync(quotationFilePath)) {
                const pdfParse = (yield Promise.resolve().then(() => __importStar(require('pdf-parse')))).default;
                const dataBuffer = yield fs_1.default.promises.readFile(quotationFilePath);
                const pdfData = yield pdfParse(dataBuffer);
                const quotationText = pdfData.text;
                const quotationAnalysis = yield aiService.analyzeDocument(quotationText);
                aiDataContent.quotation = quotationAnalysis;
                // Extract resources
                if (quotationAnalysis.resources) {
                    aiDataContent.resources = quotationAnalysis.resources;
                }
            }
            // Update with AI data
            yield prisma.oIT.update({
                where: { id: oitId },
                data: {
                    description: extractedDescription || undefined, // Only update if found
                    location: extractedLocation || undefined,
                    aiData: JSON.stringify({
                        valid: true,
                        message: 'Análisis de documentos completado',
                        data: aiDataContent
                    }),
                    resources: aiDataContent.resources ? JSON.stringify(aiDataContent.resources) : undefined
                }
            });
            // Compliance
            yield (0, notification_controller_1.createNotification)(userId, 'Verificando Cumplimiento', 'Analizando normas...', 'INFO', oitId);
            try {
                const complianceResult = yield complianceService.checkCompliance(oitId, userId);
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: { status: 'REVIEW_REQUIRED' }
                });
            }
            catch (e) {
                console.error('Compliance check error:', e);
                // Fallback: update status anyway so it doesn't get stuck
                yield prisma.oIT.update({
                    where: { id: oitId },
                    data: { status: 'REVIEW_REQUIRED' }
                });
            }
            // Planning
            try {
                yield (0, notification_controller_1.createNotification)(userId, 'Generando Propuesta', 'Creando propuesta de planeación...', 'INFO', oitId);
                const proposal = yield planningService.generateProposal(oitId);
                yield (0, notification_controller_1.createNotification)(userId, 'Propuesta Lista', `Propuesta generada con plantilla "${proposal.templateName}"`, 'SUCCESS', oitId);
            }
            catch (e) {
                console.error(e);
            }
            yield (0, notification_controller_1.createNotification)(userId, 'OIT Procesada', 'Análisis completado exitosamente.', 'SUCCESS', oitId);
        }
        catch (error) {
            console.error('Error in runOITAnalysis:', error);
            yield prisma.oIT.update({ where: { id: oitId }, data: { status: 'PENDING' } });
            yield (0, notification_controller_1.createNotification)(userId, 'Error al Procesar', 'Falló el análisis de la OIT.', 'ERROR', oitId);
        }
    });
}
function processOITFilesAsync(oitId, files, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const oitFile = (_a = files === null || files === void 0 ? void 0 : files.oitFile) === null || _a === void 0 ? void 0 : _a[0];
        const quotationFile = (_b = files === null || files === void 0 ? void 0 : files.quotationFile) === null || _b === void 0 ? void 0 : _b[0];
        let updateData = { status: 'ANALYZING' };
        if (oitFile)
            updateData.oitFileUrl = `/uploads/${oitFile.filename}`;
        if (quotationFile)
            updateData.quotationFileUrl = `/uploads/${quotationFile.filename}`;
        yield prisma.oIT.update({
            where: { id: oitId },
            data: updateData
        });
        // Run analysis using physical paths
        yield runOITAnalysis(oitId, oitFile ? oitFile.path : null, quotationFile ? quotationFile.path : null, userId);
    });
}
// Re-analyze Endpoint
const reanalyzeOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit)
            return res.status(404).json({ error: 'OIT not found' });
        // Resolve absolute paths
        const uploadsRoot = path_1.default.join(__dirname, '../../');
        let oitPath = null;
        let quotationPath = null;
        if (oit.oitFileUrl) {
            // Handle both relative URL (/uploads/file) and stored filenames
            const cleanPath = oit.oitFileUrl.replace(/^\//, '').replace(/\\/g, '/'); // Remove leading slash
            oitPath = path_1.default.join(uploadsRoot, cleanPath);
            // Fallback if not found (sometimes stored simply as uploads/file)
            if (!fs_1.default.existsSync(oitPath)) {
                oitPath = path_1.default.join(uploadsRoot, 'uploads', path_1.default.basename(oit.oitFileUrl));
            }
        }
        if (oit.quotationFileUrl) {
            const cleanPath = oit.quotationFileUrl.replace(/^\//, '').replace(/\\/g, '/');
            quotationPath = path_1.default.join(uploadsRoot, cleanPath);
            if (!fs_1.default.existsSync(quotationPath)) {
                quotationPath = path_1.default.join(uploadsRoot, 'uploads', path_1.default.basename(oit.quotationFileUrl));
            }
        }
        // Trigger Async Analysis
        runOITAnalysis(id, oitPath, quotationPath, userId).catch(err => console.error("Re-analysis error:", err));
        res.json({ message: 'Re-análisis iniciado correctamente.' });
    }
    catch (error) {
        console.error('Error re-analyzing:', error);
        res.status(500).json({ error: 'Error al iniciar re-análisis' });
    }
});
exports.reanalyzeOIT = reanalyzeOIT;
// Update OIT (supports new fields and engineer assignment)
const updateOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { oitNumber, description, status, oitFileUrl, quotationFileUrl, aiData, resources, engineerIds } = req.body;
        const data = {};
        if (oitNumber !== undefined)
            data.oitNumber = oitNumber;
        if (description !== undefined)
            data.description = description;
        if (status !== undefined)
            data.status = status;
        if (oitFileUrl !== undefined)
            data.oitFileUrl = oitFileUrl;
        if (quotationFileUrl !== undefined)
            data.quotationFileUrl = quotationFileUrl;
        if (aiData !== undefined)
            data.aiData = aiData;
        if (resources !== undefined)
            data.resources = resources;
        if (resources !== undefined)
            data.resources = resources;
        if (req.body.scheduledDate !== undefined)
            data.scheduledDate = req.body.scheduledDate;
        // Handle selectedTemplateIds (expecting array from client)
        if (req.body.selectedTemplateIds !== undefined) {
            data.selectedTemplateIds = Array.isArray(req.body.selectedTemplateIds)
                ? JSON.stringify(req.body.selectedTemplateIds)
                : req.body.selectedTemplateIds; // If already string or null
        }
        // Get the existing OIT to check for status change and current assignments
        const existing = yield prisma.oIT.findUnique({
            where: { id },
            include: { assignedEngineers: true }
        });
        if (!existing) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Validate mandatory engineer assignment when scheduling
        if (status === 'SCHEDULED') {
            const hasNewEngineers = engineerIds && Array.isArray(engineerIds) && engineerIds.length > 0;
            const hasExistingEngineers = existing.assignedEngineers.length > 0;
            // If neither new engineers are provided nor existing ones are present (and we aren't clearing them with empty array)
            const willHaveEngineers = hasNewEngineers || (hasExistingEngineers && engineerIds === undefined);
            if (!willHaveEngineers) {
                return res.status(400).json({
                    error: 'Debe asignar al menos un ingeniero de campo para programar la visita.'
                });
            }
        }
        // Transaction to update OIT and assignments
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Update OIT fields
            const updated = yield prisma.oIT.update({
                where: { id },
                data,
            });
            // 2. Update assignments if provided
            if (engineerIds && Array.isArray(engineerIds)) {
                // Remove existing
                yield prisma.oITAssignment.deleteMany({
                    where: { oitId: id }
                });
                // Add new
                if (engineerIds.length > 0) {
                    yield prisma.oITAssignment.createMany({
                        data: engineerIds.map((userId) => ({
                            oitId: id,
                            userId
                        }))
                    });
                }
            }
            return updated;
        }));
        // Create notification on status change (reuse existing logic)
        if (status && existing.status !== status) {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
            if (userId) {
                const statusMessages = {
                    'REVIEW_REQUIRED': {
                        title: 'Revisión Requerida',
                        message: `OIT ${result.oitNumber} requiere revisión. Se encontraron observaciones en el análisis.`,
                        type: 'WARNING'
                    },
                    'SCHEDULED': {
                        title: 'Muestreo Agendado',
                        message: `OIT ${result.oitNumber} ha sido agendado para muestreo.`,
                        type: 'SUCCESS'
                    },
                    'IN_PROGRESS': {
                        title: 'Muestreo en Progreso',
                        message: `OIT ${result.oitNumber} está en proceso de muestreo.`,
                        type: 'INFO'
                    },
                    'COMPLETED': {
                        title: 'OIT Completado',
                        message: `OIT ${result.oitNumber} ha sido completado exitosamente.`,
                        type: 'SUCCESS'
                    }
                };
                const notificationData = statusMessages[status];
                if (notificationData) {
                    yield (0, notification_controller_1.createNotification)(userId, notificationData.title, notificationData.message, notificationData.type, id);
                }
            }
        }
        // Return updated object with engineers
        const finalOit = yield prisma.oIT.findUnique({
            where: { id },
            include: {
                assignedEngineers: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });
        res.status(200).json(Object.assign(Object.assign({}, finalOit), { engineers: finalOit === null || finalOit === void 0 ? void 0 : finalOit.assignedEngineers.map((a) => a.user) }));
    }
    catch (error) {
        console.error('Error updating OIT:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});
exports.updateOIT = updateOIT;
const deleteOIT = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.oIT.delete({ where: { id } });
        res.status(200).json({ message: 'OIT deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Something went wrong' });
    }
});
exports.deleteOIT = deleteOIT;
const checkCompliance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        // Import dynamically to avoid potential circular dependency issues if any
        const { complianceService } = require('../services/compliance.service');
        const result = yield complianceService.checkCompliance(id, userId);
        res.json(result);
    }
    catch (error) {
        console.error('Error checking compliance:', error);
        res.status(500).json({ error: 'Error al verificar cumplimiento' });
    }
});
exports.checkCompliance = checkCompliance;
// Validate Sampling Step Data
const validateStepData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { stepIndex, stepDescription, stepRequirements, data } = req.body;
        console.log('--- VALIDATE STEP START ---');
        console.log('OIT ID:', id);
        console.log('Step Index:', stepIndex);
        console.log('Step Description:', stepDescription);
        console.log('Data recieved payload:', JSON.stringify(data, null, 2));
        console.log('Req Body keys:', Object.keys(req.body));
        if (!data) {
            console.error('MISSING DATA IN REQUEST BODY');
            return res.status(400).json({ error: 'Faltan datos para validar' });
        }
        const { validationService } = require('../services/validation.service');
        // Validate the step data using AI
        const validationResult = yield validationService.validateStepData(stepDescription, stepRequirements, data);
        // Update OIT with validation result
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Parse existing validations
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        stepValidations[stepIndex] = {
            validated: validationResult.validated,
            feedback: validationResult.feedback,
            confidence: validationResult.confidence,
            data: data,
            timestamp: new Date().toISOString()
        };
        // Update progress if validated
        let samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : { currentStep: 0, completedSteps: [] };
        if (validationResult.validated) {
            if (!samplingProgress.completedSteps.includes(stepIndex)) {
                samplingProgress.completedSteps.push(stepIndex);
            }
            samplingProgress.currentStep = stepIndex + 1;
        }
        yield prisma.oIT.update({
            where: { id },
            data: {
                stepValidations: JSON.stringify(stepValidations),
                samplingProgress: JSON.stringify(samplingProgress)
            }
        });
        res.json(validationResult);
    }
    catch (error) {
        console.error('Error validating step:', error);
        res.status(500).json({ error: 'Error al validar el paso' });
    }
});
exports.validateStepData = validateStepData;
// Finalize Sampling and Generate Analysis
const finalizeSampling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        // Verify all steps are completed
        const samplingProgress = oit.samplingProgress ? JSON.parse(oit.samplingProgress) : null;
        const stepValidations = oit.stepValidations ? JSON.parse(oit.stepValidations) : {};
        const aiData = oit.aiData ? JSON.parse(oit.aiData) : {};
        const steps = ((_a = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _a === void 0 ? void 0 : _a.steps) || [];
        if (!samplingProgress || samplingProgress.completedSteps.length !== steps.length) {
            return res.status(400).json({ error: 'No todos los pasos están completados' });
        }
        // Prepare data for analysis
        const allStepsData = steps.map((step, index) => {
            var _a;
            return ({
                step: step.description || `Paso ${index + 1}`,
                data: ((_a = stepValidations[index]) === null || _a === void 0 ? void 0 : _a.data) || {},
                validation: stepValidations[index] || {}
            });
        });
        const { validationService } = require('../services/validation.service');
        // Generate final analysis
        const finalAnalysis = yield validationService.generateFinalAnalysis(oit.oitNumber, ((_b = aiData === null || aiData === void 0 ? void 0 : aiData.data) === null || _b === void 0 ? void 0 : _b.selectedTemplate) || 'Plantilla', allStepsData);
        // Update OIT with final analysis and status
        yield prisma.oIT.update({
            where: { id },
            data: {
                finalAnalysis,
                status: 'COMPLETED'
            }
        });
        // Release Resources (Set to AVAILABLE)
        if (oit.resources) {
            try {
                const resources = JSON.parse(oit.resources);
                const resourceIds = Array.isArray(resources)
                    ? resources.map((r) => typeof r === 'string' ? r : r.id).filter(Boolean)
                    : [];
                if (resourceIds.length > 0) {
                    yield prisma.resource.updateMany({
                        where: { id: { in: resourceIds } },
                        data: { status: 'AVAILABLE' }
                    });
                }
            }
            catch (e) {
                console.error("Error releasing resources:", e);
            }
        }
        res.json({
            success: true,
            analysis: finalAnalysis
        });
    }
    catch (error) {
        console.error('Error finalizing sampling:', error);
        res.status(500).json({ error: 'Error al finalizar el muestreo' });
    }
});
exports.finalizeSampling = finalizeSampling;
// Generate Sampling Report PDF
const generateSamplingReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        if (!oit.finalAnalysis) {
            return res.status(400).json({ error: 'El muestreo no ha sido finalizado' });
        }
        // Import PDF service
        const { pdfService } = require('../services/pdf.service');
        // Generate PDF
        const pdfPath = yield pdfService.generateSamplingReport(oit);
        // Update OIT with report URL
        yield prisma.oIT.update({
            where: { id },
            data: {
                samplingReportUrl: pdfPath
            }
        });
        // Send PDF file
        res.download(pdfPath, `Informe_Muestreo_${oit.oitNumber}.pdf`);
    }
    catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Error al generar el informe PDF' });
    }
});
exports.generateSamplingReport = generateSamplingReport;
const generateFinalReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const oit = yield prisma.oIT.findUnique({ where: { id } });
        if (!oit) {
            return res.status(404).json({ error: 'OIT no encontrada' });
        }
        const { pdfService } = require('../services/pdf.service');
        const { validationService } = require('../services/validation.service');
        // 1. Extract Lab Results Text (from previously uploaded file via PATCH)
        let labText = 'No hay resultados de laboratorio adjuntos.';
        if (oit.labResultsUrl) {
            const uploadsRoot = path_1.default.join(__dirname, '../../');
            if (!oit.labResultsUrl.startsWith('http')) {
                // If labResultsUrl is just filename or relative path
                // Check if it exists in uploads/ OR uploads/lab_results/
                // For now, assuming oit.labResultsUrl is what was stored (e.g. "uploads/filename")
                const potentialPath = path_1.default.join(uploadsRoot, oit.labResultsUrl);
                if (fs_1.default.existsSync(potentialPath)) {
                    labText = yield pdfService.extractText(potentialPath);
                }
                else {
                    // Try just uploads/ + filename if URL is just filename
                    const potentialPath2 = path_1.default.join(uploadsRoot, 'uploads', oit.labResultsUrl);
                    if (fs_1.default.existsSync(potentialPath2)) {
                        labText = yield pdfService.extractText(potentialPath2);
                    }
                }
            }
        }
        // 2. AI Generation
        const reportMarkdown = yield validationService.generateFinalReportContent(oit, labText);
        // 3. Convert to HTML & PDF 
        const date = new Date().toLocaleDateString('es-CO');
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    h1, h2, h3 { color: #2c3e50; margin-top: 20px; margin-bottom: 10px; }
                    h1 { border-bottom: 2px solid #2c3e50; padding-bottom: 10px; font-size: 24px; }
                    h2 { background: #f8f9fa; padding: 10px; border-left: 5px solid #2c3e50; font-size: 18px; }
                    p { margin-bottom: 15px; text-align: justify; }
                    ul { margin-bottom: 15px; }
                    li { margin-bottom: 5px; }
                    .meta { margin-bottom: 40px; font-size: 0.9em; color: #666; border-bottom: 1px solid #eee; padding-bottom: 20px; }
                    .footer { margin-top: 50px; font-size: 0.8em; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
                </style>
            </head>
            <body>
                <div class="meta">
                    <strong>ALS V2 - Sistema de Gestión Ambiental</strong><br>
                    OIT: ${oit.oitNumber}<br>
                    Fecha de Emisión: ${date}
                </div>
                
                <div class="content">
                    ${reportMarkdown
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
            .replace(/\*(.*?)\*/gim, '<i>$1</i>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/\n\n/g, '<br>')} 
                </div>

                <div class="footer">
                    Este documento ha sido generado automáticamente por el sistema ALS V2.
                </div>
            </body>
            </html>
        `;
        const filename = `Informe_Final_OIT_${oit.oitNumber}_${Date.now()}.pdf`;
        const pdfPath = yield pdfService.generatePDFFromHTML(htmlContent, filename);
        // 4. Update OIT
        yield prisma.oIT.update({
            where: { id },
            data: { finalReportUrl: filename }
        });
        res.download(pdfPath);
    }
    catch (error) {
        console.error('Final Report Error:', error);
        res.status(500).json({ error: 'Error generando informe final' });
    }
});
exports.generateFinalReport = generateFinalReport;
