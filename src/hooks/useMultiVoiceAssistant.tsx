import { useEffect, useState } from 'react';
import { ConnectionQuality, ConnectionState, RemoteParticipant, Track } from 'livekit-client';
import { useParticipants, useTracks } from '@livekit/components-react';
import { TrackReference } from '@livekit/components-core';

export type AgentState = 'disconnected' | 'connecting' | 'initializing' | 'listening' | 'thinking' | 'speaking';

function isValidAgentState(state: string): state is AgentState {
  return ['disconnected', 'connecting', 'initializing', 'listening', 'thinking', 'speaking'].includes(state);
}

export interface VoiceAssistantInstance {
  agent: RemoteParticipant | undefined;
  state: AgentState;
  audioTrack: TrackReference | undefined;
  agentAttributes: RemoteParticipant['attributes'] | undefined;
  name: string;
  color?: string;
  id: string;
}

/**
 * Custom hook that manages multiple voice assistant instances in a LiveKit room
 * This extends the functionality of LiveKit's useVoiceAssistant to support multiple agents
 */
export function updateAgentColor(agent: RemoteParticipant, color: string) {
  try {
    const currentMetadata = agent.metadata ? JSON.parse(agent.metadata) : {};
    const newMetadata = {
      ...currentMetadata,
      color: `${color}-500`
    };
    // Use the metadata property directly
    agent.metadata = JSON.stringify(newMetadata);
  } catch (error) {
    console.error('Error updating agent color:', error);
  }
}

export function useMultiVoiceAssistant() {
  const [voiceAssistants, setVoiceAssistants] = useState<VoiceAssistantInstance[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const participants = useParticipants();
  const tracks = useTracks();

  // Find all agent participants and their tracks
  useEffect(() => {
    try {
      // Filter only remote participants that are agents
      const agentParticipants = participants.filter((participant): participant is RemoteParticipant => {
        if (!(participant instanceof RemoteParticipant)) {
          return false;
        }
        try {
          const metadata = participant.metadata ? JSON.parse(participant.metadata) : {};
          return metadata.isAgent === true || participant.identity.startsWith('agent-');
        } catch {
          return participant.identity.startsWith('agent-');
        }
      });

      const currentAssistants = agentParticipants.map((agent) => {
        const audioTrack = tracks.find(
          (trackRef) =>
            trackRef.participant.identity === agent.identity &&
            trackRef.publication.kind === Track.Kind.Audio
        );

        // Extract name from metadata or attributes, fallback to identity
        let name = "Agent";
        try {
          const metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
          name = metadata.name || agent.attributes?.name || `Agent ${agent.identity}`;
        } catch {
          name = agent.attributes?.name || `Agent ${agent.identity}`;
        }

        // Get color from metadata or attributes
        let color;
        try {
          const metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
          color = metadata.color || agent.attributes?.color || undefined;
        } catch {
          color = agent.attributes?.color || undefined;
        }

        return {
          agent,
          state: determineAgentState(agent),
          audioTrack,
          agentAttributes: agent.attributes,
          name,
          color,
          id: agent.identity
        };
      });

      setVoiceAssistants(currentAssistants);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update voice assistants'));
      console.error('Error updating voice assistants:', err);
    }
  }, [participants, tracks]);

  return {
    voiceAssistants,
    count: voiceAssistants.length,
    error,
    isLoading: participants.length > 0 && voiceAssistants.length === 0,
  };
}

// Helper function to determine agent state based on metadata and attributes
// Helper function to determine agent state based on metadata and attributes
function determineAgentState(agent: RemoteParticipant): AgentState {
  try {
    // Check connection quality
    if (agent.connectionQuality === ConnectionQuality.Lost) {
      return 'disconnected';
    }

    let metadata = {};
    try {
      metadata = agent.metadata ? JSON.parse(agent.metadata) : {};
      if (typeof metadata === 'object' && metadata !== null && 'state' in metadata) {
        const state = (metadata as { state: string }).state.toLowerCase();
        if (isValidAgentState(state)) {
          return state as AgentState;
        }
      }
    } catch {
      // Ignore metadata parse errors
    }

    // Check audio tracks
    const hasAudioTrack = Array.from(agent.trackPublications.values())
      .filter(track => track.kind === Track.Kind.Audio)
      .some((track) => track.isSubscribed && !track.isMuted);

    if (hasAudioTrack) {
      return 'listening';
    }

    // If connected but no audio
    const audioTrackCount = Array.from(agent.trackPublications.values())
      .filter(track => track.kind === Track.Kind.Audio)
      .length;
    return audioTrackCount > 0 ? 'initializing' : 'disconnected';
  } catch (error) {
    console.error('Error determining agent state:', error);
    return 'disconnected';
  }
}
