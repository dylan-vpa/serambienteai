"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const oit_routes_1 = __importDefault(require("./oit.routes"));
const resource_routes_1 = __importDefault(require("./resource.routes"));
const ai_routes_1 = __importDefault(require("./ai.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/oits', oit_routes_1.default);
router.use('/resources', resource_routes_1.default);
router.use('/ai', ai_routes_1.default);
exports.default = router;
