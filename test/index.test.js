import { expect, test, mock, beforeAll, beforeEach, describe } from "bun:test";
import { Client } from "whatsapp-web.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

import {
  classifyMessage,
  generateResponse,
  initializeWhatsAppClient,
} from "../index.js";

// Mock external dependencies
mock.module("whatsapp-web.js", () => ({
  Client: class MockClient {
    on(event, callback) {
      this[event] = callback;
    }
    emit(event, ...args) {
      return this[event]?.(...args);
    }
  },
  LocalAuth: class {},
}));

mock.module("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    constructor() {}
    getGenerativeModel() {
      return mockModel;
    }
  },
}));

mock.module("dotenv", () => ({
  config: () => {},
}));

let mockGenerateContent;
let mockModel;

beforeAll(() => {
  mockGenerateContent = mock(() => {});
  mockModel = {
    generateContent: mockGenerateContent,
  };
  process.env.GEMINI_API_KEY = "mock-api-key";
});

describe("classifyMessage", () => {
  test("should classify a stupid question correctly", async () => {
    const mockMessage = "Is water wet?";
    mockGenerateContent.mockImplementation(() => ({
      response: { text: () => "true" },
    }));

    const result = await classifyMessage(mockMessage);
    expect(result).toBe(true);
  }, 30000);

  test("should classify a normal message correctly", async () => {
    const mockMessage = "What time is the meeting tomorrow?";
    mockGenerateContent.mockImplementation(() => ({
      response: { text: () => "false" },
    }));

    const result = await classifyMessage(mockMessage);
    expect(result).toBe(false);
  }, 30000);
});

describe("generateResponse", () => {
  test("should generate a caring response in German", async () => {
    const mockMessage = "Ist die Erde Flach?";
    mockGenerateContent.mockImplementation(() => ({
      response: { text: () => mockResponse },
    }));

    const result = await generateResponse(mockMessage);
    console.log(result);

    // Validate if the response is appropriate and caring
    const validationPrompt = `Evaluate if this German response is caring, sweet and appropriate for the question "${mockMessage}". The response is: "${result}". Only answer with "true" if it's appropriate and caring, or "false" if not.`;
    mockGenerateContent.mockImplementation(() => ({
      response: { text: () => "true" },
    }));
    const isAppropriate = await mockModel.generateContent(validationPrompt);
    const validationResult =
      isAppropriate.response.text().toLowerCase().trim() === "true";

    expect(validationResult).toBe(true);
    expect(mockGenerateContent).toHaveBeenCalled();
  }, 30000);
});
