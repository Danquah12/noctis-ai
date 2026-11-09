/**
 * NOCTIS LORA & QLORA NATIVE MODEL WEIGHT ADAPTATION PIPELINE
 * Subsystem Code: NLPA-TRAIN-001 / LORA-2026
 *
 * Implements:
 * 1. Multi-format training dataset compiler (ChatML, ShareGPT, Alpaca)
 * 2. Ingestion of vibe-training, clinical benchmarks (Health 500), and engineering challenges
 * 3. QLoRA hyperparameter configuration synthesizer (4-bit NF4, Rank 64, Alpha 128, target modules)
 * 4. Dataset token distribution, split ratio (Train/Val 90/10), and training step estimators
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatMlTrainingExample {
  id: string;
  sourceCategory: "CLINICAL" | "ENGINEERING" | "SCIENCE" | "CYBER_DEFENSE" | "GENERAL";
  messages: ChatMessage[];
}

export interface QLoRAHyperparameters {
  baseModel: string;
  loraRank: number;
  loraAlpha: number;
  loraDropout: number;
  targetModules: string[];
  quantizationBits: 4 | 8 | 16;
  quantizationType: "nf4" | "fp4";
  doubleQuantization: boolean;
  learningRate: number;
  lrScheduler: "cosine" | "linear";
  warmupRatio: number;
  weightDecay: number;
  batchSizePerDevice: number;
  gradientAccumulationSteps: number;
  effectiveBatchSize: number;
  maxSequenceLength: number;
  gradientCheckpointing: boolean;
}

export interface DatasetCompilationSummary {
  totalExamples: number;
  trainExamplesCount: number;
  validationExamplesCount: number;
  categoryBreakdown: Record<string, number>;
  estimatedTotalTokens: number;
  recommendedTrainingSteps: number;
  recommendedEpochs: number;
}

export const NOCTIS_SYSTEM_PROMPT =
  "You are Noctis AI, a sovereign intelligence system operating with deterministic mathematical rigor, formal clinical safety verification, and evidence-based decision support.";

/**
 * Format raw instruction pairs into ChatML structure
 */
export function formatInstructionToChatMl(
  id: string,
  userPrompt: string,
  assistantResponse: string,
  category: ChatMlTrainingExample["sourceCategory"] = "GENERAL",
  customSystemPrompt?: string
): ChatMlTrainingExample {
  return {
    id,
    sourceCategory: category,
    messages: [
      {
        role: "system",
        content: customSystemPrompt || NOCTIS_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt.trim(),
      },
      {
        role: "assistant",
        content: assistantResponse.trim(),
      },
    ],
  };
}

/**
 * Synthesize standard QLoRA fine-tuning hyperparameters for Noctis models
 */
export function synthesizeQloraConfig(baseModelName = "meta-llama/Llama-3.3-70B-Instruct"): QLoRAHyperparameters {
  return {
    baseModel: baseModelName,
    loraRank: 64,
    loraAlpha: 128,
    loraDropout: 0.05,
    targetModules: ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    quantizationBits: 4,
    quantizationType: "nf4",
    doubleQuantization: true,
    learningRate: 2e-4,
    lrScheduler: "cosine",
    warmupRatio: 0.03,
    weightDecay: 0.01,
    batchSizePerDevice: 2,
    gradientAccumulationSteps: 8,
    effectiveBatchSize: 16,
    maxSequenceLength: 4096,
    gradientCheckpointing: true,
  };
}

/**
 * Calculate dataset metrics and training step count
 */
export function compileDatasetSummary(examples: ChatMlTrainingExample[]): DatasetCompilationSummary {
  const categoryBreakdown: Record<string, number> = {};
  let totalChars = 0;

  for (const ex of examples) {
    categoryBreakdown[ex.sourceCategory] = (categoryBreakdown[ex.sourceCategory] || 0) + 1;
    for (const msg of ex.messages) {
      totalChars += msg.content.length;
    }
  }

  // Approximation: ~4 chars per token
  const estimatedTotalTokens = Math.round(totalChars / 4);
  const trainCount = Math.floor(examples.length * 0.9);
  const valCount = examples.length - trainCount;

  const epochs = 3;
  const effectiveBatchSize = 16;
  const stepsPerEpoch = Math.max(1, Math.ceil(trainCount / effectiveBatchSize));
  const recommendedTrainingSteps = stepsPerEpoch * epochs;

  return {
    totalExamples: examples.length,
    trainExamplesCount: trainCount,
    validationExamplesCount: valCount,
    categoryBreakdown,
    estimatedTotalTokens,
    recommendedTrainingSteps,
    recommendedEpochs: epochs,
  };
}
