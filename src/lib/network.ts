import { readJsonLines } from './jsonl';

export const GROUND_LINE = 'GROUND';
const NODE_SEPARATOR = '|';

interface LineRecord {
  from_id: string;
  from_line: string;
  to_id: string;
  to_line: string;
  time: number;
}

interface GraphEdge {
  node: string;
  weight: number;
}

interface DijkstraResult {
  distances: Map<string, number>;
  previous: Map<string, string>;
  groundDistances: Map<string, number>;
}

export interface RouteStep {
  nodeKey: string;
  stationId: string;
  line: string;
  cumulativeTime: number;
}

class MinPriorityQueue {
  private heap: Array<{ node: string; priority: number }> = [];

  enqueue(node: string, priority: number) {
    this.heap.push({ node, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): { node: string; priority: number } | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const smallest = this.heap[0];
    const end = this.heap.pop();
    if (end && this.heap.length > 0) {
      this.heap[0] = end;
      this.sinkDown(0);
    }

    return smallest;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(index: number) {
    let currentIndex = index;
    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      if (this.heap[currentIndex].priority >= this.heap[parentIndex].priority) {
        break;
      }
      this.swap(currentIndex, parentIndex);
      currentIndex = parentIndex;
    }
  }

  private sinkDown(index: number) {
    let currentIndex = index;
    const length = this.heap.length;

    while (true) {
      const leftChildIndex = currentIndex * 2 + 1;
      const rightChildIndex = currentIndex * 2 + 2;
      let smallest = currentIndex;

      if (
        leftChildIndex < length &&
        this.heap[leftChildIndex].priority < this.heap[smallest].priority
      ) {
        smallest = leftChildIndex;
      }

      if (
        rightChildIndex < length &&
        this.heap[rightChildIndex].priority < this.heap[smallest].priority
      ) {
        smallest = rightChildIndex;
      }

      if (smallest === currentIndex) {
        break;
      }

      this.swap(currentIndex, smallest);
      currentIndex = smallest;
    }
  }

  private swap(i: number, j: number) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}

let graphCache: Map<string, GraphEdge[]> | null = null;
let groundStationsCache: Set<string> | null = null;
const dijkstraCache = new Map<string, DijkstraResult>();

function createNodeKey(stationId: string, line: string): string {
  return `${stationId}${NODE_SEPARATOR}${line}`;
}

function parseNodeKey(nodeKey: string): { stationId: string; line: string } {
  const separatorIndex = nodeKey.indexOf(NODE_SEPARATOR);
  if (separatorIndex === -1) {
    throw new Error(`Invalid node key: ${nodeKey}`);
  }
  const stationId = nodeKey.slice(0, separatorIndex);
  const line = nodeKey.slice(separatorIndex + 1);
  return { stationId, line };
}

async function loadGraph() {
  if (graphCache && groundStationsCache) {
    return;
  }

  const records = await readJsonLines<LineRecord>('src/data/lines.jsonl');
  const graph = new Map<string, GraphEdge[]>();
  const groundStations = new Set<string>();

  for (const record of records) {
    const weight = Number(record.time);
    if (!Number.isFinite(weight) || weight < 0) {
      continue;
    }

    const fromKey = createNodeKey(record.from_id, record.from_line);
    const toKey = createNodeKey(record.to_id, record.to_line);

    if (!graph.has(fromKey)) {
      graph.set(fromKey, []);
    }
    graph.get(fromKey)!.push({ node: toKey, weight });

    if (!graph.has(toKey)) {
      graph.set(toKey, []);
    }

    if (record.from_line === GROUND_LINE) {
      groundStations.add(record.from_id);
    }
    if (record.to_line === GROUND_LINE) {
      groundStations.add(record.to_id);
    }
  }

  graphCache = graph;
  groundStationsCache = groundStations;
}

export async function getGroundStationIds(): Promise<Set<string>> {
  await loadGraph();
  return new Set(groundStationsCache!);
}

export async function getTravelTimesFromStation(
  stationId: string,
): Promise<Map<string, number>> {
  const result = await runDijkstra(stationId);
  return new Map(result.groundDistances);
}
async function runDijkstra(stationId: string): Promise<DijkstraResult> {
  await loadGraph();
  const graph = graphCache!;

  if (!groundStationsCache!.has(stationId)) {
    throw new Error(`Station ${stationId} is not available as a ground node`);
  }

  const cachedResult = dijkstraCache.get(stationId);
  if (cachedResult) {
    return cachedResult;
  }

  const startNode = createNodeKey(stationId, GROUND_LINE);
  if (!graph.has(startNode)) {
    throw new Error(`No graph node found for station ${stationId}`);
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  const queue = new MinPriorityQueue();

  queue.enqueue(startNode, 0);
  distances.set(startNode, 0);

  while (!queue.isEmpty()) {
    const current = queue.dequeue();
    if (!current) {
      break;
    }

    const { node, priority: currentDistance } = current;
    if (visited.has(node)) {
      continue;
    }
    visited.add(node);

    const neighbors = graph.get(node);
    if (!neighbors) {
      continue;
    }

    for (const edge of neighbors) {
      const tentative = currentDistance + edge.weight;
      const existingDistance = distances.get(edge.node);

      if (existingDistance === undefined || tentative < existingDistance) {
        distances.set(edge.node, tentative);
        previous.set(edge.node, node);
        queue.enqueue(edge.node, tentative);
      }
    }
  }

  const groundDistances = new Map<string, number>();
  for (const [nodeKey, distance] of distances) {
    const { stationId: destinationId, line } = parseNodeKey(nodeKey);
    if (line === GROUND_LINE) {
      groundDistances.set(destinationId, distance);
    }
  }

  const result: DijkstraResult = {
    distances,
    previous,
    groundDistances,
  };

  dijkstraCache.set(stationId, result);

  return result;
}

export async function getRouteStepsBetweenStations(
  originStationId: string,
  destinationStationId: string,
): Promise<{ steps: RouteStep[]; totalTime: number }> {
  const { distances, previous } = await runDijkstra(originStationId);

  const destinationNode = createNodeKey(destinationStationId, GROUND_LINE);
  const startNode = createNodeKey(originStationId, GROUND_LINE);

  if (!distances.has(destinationNode)) {
    throw new Error(
      `Destination ${destinationStationId} is unreachable from ${originStationId}`,
    );
  }

  const path: string[] = [];
  let currentNode: string | undefined = destinationNode;

  while (currentNode) {
    path.push(currentNode);
    if (currentNode === startNode) {
      break;
    }
    currentNode = previous.get(currentNode);
  }

  if (path[path.length - 1] !== startNode) {
    throw new Error(
      `Failed to reconstruct route from ${originStationId} to ${destinationStationId}`,
    );
  }

  path.reverse();

  const steps: RouteStep[] = path.map((nodeKey) => {
    const { stationId, line } = parseNodeKey(nodeKey);
    const cumulativeTime = distances.get(nodeKey);
    if (cumulativeTime === undefined) {
      throw new Error(`Missing cumulative time for node ${nodeKey}`);
    }
    return { nodeKey, stationId, line, cumulativeTime };
  });

  const totalTime = distances.get(destinationNode)!;

  return { steps, totalTime };
}
