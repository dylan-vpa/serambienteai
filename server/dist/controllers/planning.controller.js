"use strict";
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
exports.rejectPlanning = exports.acceptPlanning = exports.generatePlanning = void 0;
const planning_service_1 = __importDefault(require("../services/planning.service"));
const generatePlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const proposal = yield planning_service_1.default.generateProposal(id);
        res.json(proposal);
    }
    catch (error) {
        console.error('Error generating planning:', error);
        res.status(500).json({ error: 'Error al generar planeación' });
    }
});
exports.generatePlanning = generatePlanning;
const acceptPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield planning_service_1.default.acceptProposal(id);
        res.json({ message: 'Planeación aceptada' });
    }
    catch (error) {
        console.error('Error accepting planning:', error);
        res.status(500).json({ error: 'Error al aceptar planeación' });
    }
});
exports.acceptPlanning = acceptPlanning;
const rejectPlanning = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield planning_service_1.default.rejectProposal(id);
        res.json({ message: 'Planeación rechazada' });
    }
    catch (error) {
        console.error('Error rejecting planning:', error);
        res.status(500).json({ error: 'Error al rechazar planeación' });
    }
});
exports.rejectPlanning = rejectPlanning;
