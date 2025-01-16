import { ChatMessageType, ChatTile } from "@/components/chat/ChatTile";
import { VoiceAssistantInstance } from "@/hooks/useMultiVoiceAssistant";
import {
  TrackReferenceOrPlaceholder,
  useChat,
  useLocalParticipant,
  useTrackTranscription,
} from "@livekit/components-react";
import {
  LocalParticipant,
  Track,
} from "livekit-client";
import { useEffect, useState } from "react";

const MAX_AGENTS = 4; // Maximum number of supported agents

export function TranscriptionTile({
  voiceAssistants,
  defaultAccentColor,
}: {
  voiceAssistants: VoiceAssistantInstance[];
  defaultAccentColor: string;
}) {
  const localParticipant = useLocalParticipant();
  const localMessages = useTrackTranscription({
    publication: localParticipant.microphoneTrack,
    source: Track.Source.Microphone,
    participant: localParticipant.localParticipant,
  });

  // Create fixed number of transcription hooks
  const transcriptionHooks = [
    useTrackTranscription(voiceAssistants[0]?.audioTrack),
    useTrackTranscription(voiceAssistants[1]?.audioTrack),
    useTrackTranscription(voiceAssistants[2]?.audioTrack),
    useTrackTranscription(voiceAssistants[3]?.audioTrack),
  ];

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const { chatMessages, send: sendChat } = useChat();

  useEffect(() => {
    const allMessages: ChatMessageType[] = [];

    // Add local participant messages
    localMessages.segments.forEach((segment) => {
      allMessages.push({
        name: "You",
        message: segment.final ? segment.text : `${segment.text} ...`,
        timestamp: Date.now(),
        isSelf: true,
      });
    });

    // Add agent messages
    voiceAssistants.forEach((assistant, index) => {
      if (index < MAX_AGENTS && assistant.audioTrack) {
        const transcription = transcriptionHooks[index];
        transcription.segments.forEach((segment) => {
          allMessages.push({
            name: assistant.name,
            message: segment.final ? segment.text : `${segment.text} ...`,
            timestamp: Date.now(),
            isSelf: false,
          });
        });
      }
    });

    // Add chat messages
    chatMessages.forEach((msg) => {
      const assistant = voiceAssistants.find(
        (a) => a.agent?.identity === msg.from?.identity
      );
      const isSelf =
        msg.from?.identity === localParticipant.localParticipant.identity;
      
      const name = msg.from?.name || (assistant ? assistant.name : (isSelf ? "You" : "Unknown"));
      
      allMessages.push({
        name,
        message: msg.message,
        timestamp: msg.timestamp,
        isSelf,
      });
    });

    // Sort messages by timestamp
    allMessages.sort((a, b) => a.timestamp - b.timestamp);
    setMessages(allMessages);
  }, [
    localMessages.segments,
    transcriptionHooks,
    chatMessages,
    voiceAssistants,
    localParticipant.localParticipant.identity,
    defaultAccentColor,
  ]);

  return (
    <ChatTile 
      messages={messages} 
      accentColor={defaultAccentColor} 
      onSend={sendChat} 
    />
  );
}
