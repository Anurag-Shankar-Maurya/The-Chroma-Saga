import React, { useMemo } from 'react';
import type { StoryStep } from '../types';

interface SagaGalleryProps {
  storyHistory: StoryStep[];
  onNavigate: (nodeId: string) => void;
  currentNodeId: string;
  storyNodes: { [id: string]: StoryStep };
  rootNodeId: string | null;
}

const treeStyles = `
  .saga-tree-container {
    overflow: auto;
    padding: 1rem;
    background-color: #F8F6F2;
    border-radius: 1rem;
    border: 1px solid #EAE6E1;
    min-height: 200px;
  }
  .saga-tree ul {
    position: relative;
    padding-top: 1rem;
    display: flex;
    justify-content: center;
    transition: all 0.5s;
  }
  .saga-tree li {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    list-style-type: none;
    position: relative;
    padding: 1rem .5rem 0 .5rem;
    transition: all 0.5s;
  }
  .saga-tree li::before, .saga-tree li::after {
    content: '';
    position: absolute;
    top: 0;
    right: 50%;
    border-top: 2px solid #D1C7BC;
    width: 50%;
    height: 1rem;
  }
  .saga-tree li::after {
    right: auto;
    left: 50%;
    border-left: 2px solid #D1C7BC;
  }
  .saga-tree li:only-child { 
    padding-top: 0;
  }
  .saga-tree li:only-child::after, .saga-tree li:only-child::before {
    display: none;
  }
  .saga-tree li:first-child::before, .saga-tree li:last-child::after {
    border: 0 none;
  }
  .saga-tree li:last-child::before {
    border-right: 2px solid #D1C7BC;
    border-radius: 0 5px 0 0;
  }
  .saga-tree li:first-child::after {
    border-radius: 5px 0 0 0;
  }
  .saga-tree ul ul::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    border-left: 2px solid #D1C7BC;
    width: 0;
    height: 1rem;
  }
  /* Highlight path */
  .saga-tree li.on-path > .node-content::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    border: 2px solid #4A443E;
    border-radius: .6rem;
    animation: pulse-border 2s infinite;
  }
  .saga-tree li.on-path > div::after,
  .saga-tree li.on-path::before,
  .saga-tree li.on-path::after,
  .saga-tree ul.has-path-child::before {
    border-color: #4A443E;
  }
  @keyframes pulse-border {
    0% { border-color: #4A443E; }
    50% { border-color: #A8998A; }
    100% { border-color: #4A443E; }
  }
`;

interface TreeNodeProps {
  nodeId: string;
  storyNodes: { [id: string]: StoryStep };
  onNavigate: (nodeId: string) => void;
  currentNodeId: string;
  pathNodeIds: Set<string>;
}

const TreeNode: React.FC<TreeNodeProps> = ({ nodeId, storyNodes, onNavigate, currentNodeId, pathNodeIds }) => {
  const node = storyNodes[nodeId];
  if (!node) return null;

  const childIds = Object.values(node.childrenIds);
  const isOnPath = pathNodeIds.has(nodeId);
  const hasPathChild = childIds.some(id => pathNodeIds.has(id));

  return (
    <li className={isOnPath ? 'on-path' : ''}>
      <div className="node-content relative">
        <button
          onClick={() => onNavigate(node.id)}
          disabled={node.id === currentNodeId}
          className="group relative w-24 h-16 rounded-lg shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4A443E] disabled:cursor-not-allowed"
          aria-label={`Navigate to step: ${node.choiceMade}`}
        >
          <img
            src={node.imageUrl}
            alt={node.choiceMade}
            className={`w-full h-full rounded-lg object-cover border-2 shadow-md transition-all ${node.id === currentNodeId ? 'border-[#4A443E]' : 'border-transparent group-hover:border-gray-400'}`}
          />
          {node.id !== currentNodeId && (
            <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
              </svg>
            </div>
          )}
        </button>
      </div>
      {childIds.length > 0 && (
        <ul className={hasPathChild ? 'has-path-child' : ''}>
          {childIds.map(childId => (
            <TreeNode
              key={childId}
              nodeId={childId}
              storyNodes={storyNodes}
              onNavigate={onNavigate}
              currentNodeId={currentNodeId}
              pathNodeIds={pathNodeIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
};


export const SagaGallery: React.FC<SagaGalleryProps> = ({ storyHistory, onNavigate, currentNodeId, storyNodes, rootNodeId }) => {

  const pathNodeIds = useMemo(() => new Set(storyHistory.map(step => step.id)), [storyHistory]);

  if (!rootNodeId) {
    return (
      <div className="bg-white/80 p-3 rounded-2xl shadow-inner border border-gray-200/80">
        <p className="text-sm text-gray-500">Your visual journey will appear here...</p>
      </div>
    );
  }

  return (
    <>
      <style>{treeStyles}</style>
      <div className="saga-tree-container">
        <div className="saga-tree inline-block min-w-full">
          <ul>
            <TreeNode
              nodeId={rootNodeId}
              storyNodes={storyNodes}
              onNavigate={onNavigate}
              currentNodeId={currentNodeId}
              pathNodeIds={pathNodeIds}
            />
          </ul>
        </div>
      </div>
    </>
  );
};
