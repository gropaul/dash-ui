import { openAIChatService } from './openai-chat-service';

/**
 * This is a simple test script to verify that the OpenAI chat service is working correctly.
 * To run this script, make sure you have set the OPENAI_API_KEY environment variable in your .env file.
 * 
 * Run with: npx ts-node src/components/chat/test-openai-service.ts
 */
async function testOpenAIService() {
  console.log('Testing OpenAI Chat Service...');
  
  try {
    // Create a new session with a user message
    const session = openAIChatService.addUserMessage('Hello, can you tell me about yourself?');
    console.log('Created session:', session.id);
    console.log('Added user message:', session.messages[0].content);
    
    // Get a response from the assistant
    console.log('Waiting for assistant response...');
    const updatedSession = await openAIChatService.inferAssistantMessage({
      sessionId: session.id,
    });
    
    // Log the assistant's response
    const assistantMessage = updatedSession.messages[1];
    console.log('Assistant response:', assistantMessage.content);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing OpenAI service:', error);
  }
}

// Run the test
testOpenAIService();