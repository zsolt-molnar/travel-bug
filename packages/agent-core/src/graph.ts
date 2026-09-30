import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { mockLlmComplete, type MockAgentResult } from './mock-llm';

/**
 * LangGraph scaffold with Supervisor → specialist nodes.
 * Nodes call MockLLM only (ARCHITECTURE §8 / §9 swap point).
 */

const GraphState = Annotation.Root({
  message: Annotation<string>,
  userId: Annotation<string | undefined>,
  operatorId: Annotation<string | undefined>,
  route: Annotation<MockAgentResult['route'] | undefined>,
  result: Annotation<MockAgentResult | undefined>,
});

function supervisorNode(state: typeof GraphState.State) {
  const preview = mockLlmComplete(state.message);
  return { route: preview.route };
}

function itineraryPlannerNode(state: typeof GraphState.State) {
  return { result: mockLlmComplete(state.message) };
}

function documentAgentNode(state: typeof GraphState.State) {
  return { result: mockLlmComplete(state.message) };
}

function curatorNode(state: typeof GraphState.State) {
  return { result: mockLlmComplete(state.message) };
}

function generalNode(state: typeof GraphState.State) {
  return { result: mockLlmComplete(state.message) };
}

function routeFromSupervisor(state: typeof GraphState.State) {
  switch (state.route) {
    case 'itinerary':
      return 'itineraryPlanner';
    case 'document':
      return 'documentAgent';
    case 'curator':
      return 'curator';
    default:
      return 'general';
  }
}

const graph = new StateGraph(GraphState)
  .addNode('supervisor', supervisorNode)
  .addNode('itineraryPlanner', itineraryPlannerNode)
  .addNode('documentAgent', documentAgentNode)
  .addNode('curator', curatorNode)
  .addNode('general', generalNode)
  .addEdge(START, 'supervisor')
  .addConditionalEdges('supervisor', routeFromSupervisor, {
    itineraryPlanner: 'itineraryPlanner',
    documentAgent: 'documentAgent',
    curator: 'curator',
    general: 'general',
  })
  .addEdge('itineraryPlanner', END)
  .addEdge('documentAgent', END)
  .addEdge('curator', END)
  .addEdge('general', END);

const compiled = graph.compile();

export async function runMockConciergeGraph(input: {
  message: string;
  userId?: string;
  operatorId?: string;
}): Promise<MockAgentResult> {
  const out = await compiled.invoke({
    message: input.message,
    userId: input.userId,
    operatorId: input.operatorId,
  });
  return (
    out.result ?? {
      route: 'general',
      text: 'No response.',
      tools: [],
    }
  );
}
