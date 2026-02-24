import { parentPort, workerData } from "worker_threads";
import { findPaths } from "./DPnew.js";

const { target, items, limits } = workerData;
const result = findPaths(target, items, limits);
parentPort.postMessage(result);
