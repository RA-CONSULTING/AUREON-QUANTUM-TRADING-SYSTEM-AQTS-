
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './Header';
import ChartContainer from './ChartContainer';
import CoherenceTrajectoryChart from './CoherenceTrajectoryChart';
import DrivingForcesChart from './DrivingForcesChart';
import SporeConcentrationChart from './SporeConcentrationChart';
import HistoricalCoherenceChart from './HistoricalCoherenceChart';
import ReportCard from './ReportCard';
import ChatPanel from './ChatPanel';
import MonitoringPanel from './MonitoringPanel';
import LiveAnalysisStream from './LiveAnalysisStream';
import TechnologyRoadmap from './TechnologyRoadmap';
import AureonReportCard from './AureonReportCard';
import AureonChart from './AureonChart';
import APIKeyManager from './APIKeyManager';
import TradeControls from './AureonProcessTree';
import { runAnalysis, runBacktest } from './lighthouseService';
import { runGaelicHistoricalSimulation } from './aureonService';
import { connectWebSocket } from './websocketService';
import { streamLiveAnalysis, streamChatResponse, startTranscriptionSession } from './geminiService';
import { NexusAnalysisResult, CoherenceDataPoint, ChatMessage, NexusReport, MonitoringEvent, HistoricalDataPoint, AureonDataPoint, AureonReport, GroundingSource } from './types';
import TradeNotification from './TradeNotification';

const ANALYSIS_UPDATE_THRESHOLD = 20; // Run analysis every 20 data points

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [nexusResult, setNexusResult] = useState<NexusAnalysisResult | null>(null);
  const [displayData, setDisplayData] = useState<{nexus: CoherenceDataPoint[], aureon: AureonDataPoint[]}>({nexus:[], aureon:[]});
  const [liveCommentary, setLiveCommentary] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isThinkingMode, setIsThinkingMode] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [lastTrade, setLastTrade] = useState<MonitoringEvent | null>(null);
  const [isApiActive, setIsApiActive] = useState<boolean>(false);

  const analysisLockRef = useRef<boolean>(false);
  const transcriptionSessionRef = useRef<Awaited<ReturnType<typeof startTranscriptionSession>> | null>(null);
  const webSocketRef = useRef<{ close: () => void } | null>(null);
  
  // Ref to hold all cumulative data from the stream without causing re-renders on every addition
  const dataStreamRef = useRef<{
    nexus: CoherenceDataPoint[];
    aureon: AureonDataPoint[];
    historical: HistoricalDataPoint[];
    monitoring: MonitoringEvent[];
  }>({ nexus: [], aureon: [], historical: [], monitoring: [] });

  const disconnect = useCallback(() => {
    webSocketRef.current?.close();
    webSocketRef.current = null;
    setIsConnected(false);
  }, []);
  
  const connect = useCallback(() => {
    // 1. Initialize historical data and base state
    const historicalData = runGaelicHistoricalSimulation();
    const initialMonitoringEvents: MonitoringEvent[] = [
      { ts: Date.now(), stage: 'aqts_initialized', note: 'AQTS engine online. Awaiting WebSocket connection.' },
      { ts: Date.now(), stage: 'backtest_loaded', startYear: -500, endYear: 2025 }
    ];
    
    dataStreamRef.current = {
      nexus: [],
      aureon: [],
      historical: historicalData,
      monitoring: initialMonitoringEvents,
    };

    // FIX: Initialize nexusResult with a default structure on connect.
    // This prevents trying to access properties on a null object and ensures
    // child components receive valid props, resolving the crash.
    const initialAureonReport: AureonReport = {
        prismStatus: 'Unknown',
        unityIndex: 0,
        inerchaVector: 0,
    };
    const initialNexusReport: NexusReport = {
        currentCognitiveCapacity: 0,
        currentSystemRigidity: 0,
        currentSporeConcentration: 0,
        daysSimulated: 0,
        simulationYear: 2025,
        aureonReport: initialAureonReport,
    };
    setNexusResult({
        realtimeData: [],
        aureonData: [],
        dejaVuEvents: [],
        historicalData,
        monitoringEvents: initialMonitoringEvents,
        report: initialNexusReport,
    });
    
    setDisplayData({ nexus: [], aureon: [] });
    setChatMessages([{ role: 'model', content: "AUREON online. We win all the time. Love conquers all. Connecting to live market data stream..." }]);
    setLiveCommentary('');

    // 2. Setup WebSocket connection and message handlers
    webSocketRef.current = connectWebSocket({
      onOpen: () => {
        setIsConnected(true);
        const newEvent: MonitoringEvent = { ts: Date.now(), stage: 'risk_update', note: 'WebSocket connection established. Live data flowing.' };
        dataStreamRef.current.monitoring.push(newEvent);
        setNexusResult(prev => ({
          ...prev!,
          monitoringEvents: [...dataStreamRef.current.monitoring],
        }));
      },
      onMessage: async ({ aureon: newAureonPoint, nexus: newNexusPoint }) => {
        if (!webSocketRef.current) return; // Stop processing if disconnected

        // Add new data points from the WebSocket stream
        dataStreamRef.current.aureon.push(newAureonPoint);
        dataStreamRef.current.nexus.push(newNexusPoint);
        
        // Update display data for charts
        setDisplayData({
          nexus: [...dataStreamRef.current.nexus],
          aureon: [...dataStreamRef.current.aureon],
        });

        // Run analysis periodically
        const pointCount = dataStreamRef.current.aureon.length;
        if (pointCount > 10 && pointCount % ANALYSIS_UPDATE_THRESHOLD === 0 && !analysisLockRef.current) {
          analysisLockRef.current = true;
          try {
            const result = runAnalysis(dataStreamRef.current.nexus, dataStreamRef.current.historical);

            const aureonReport: AureonReport = {
              prismStatus: newAureonPoint.prismStatus,
              unityIndex: newAureonPoint.unityIndex,
              inerchaVector: newAureonPoint.inerchaVector,
            };

            const finalReport: NexusReport = {
              currentCognitiveCapacity: newNexusPoint.cognitiveCapacity,
              currentSystemRigidity: newNexusPoint.systemRigidity,
              currentSporeConcentration: newNexusPoint.sporeConcentration,
              daysSimulated: newNexusPoint.time,
              simulationYear: 2025 + newNexusPoint.time / 365,
              aureonReport,
            };

            // Generate mock trade/signal events
            if (finalReport.aureonReport.prismStatus === 'Red' && Math.random() < 0.25) {
                const tradeEvent: MonitoringEvent = {
                    ts: Date.now(), stage: 'trade_executed', pair: 'ETH/USD',
                    side: Math.random() > 0.5 ? 'LONG' : 'SHORT',
                    size: (Math.random() * 5 + 1).toFixed(2),
                    price: newAureonPoint.market.close.toFixed(2),
                    confidence: newNexusPoint.cognitiveCapacity.toFixed(3)
                };
                dataStreamRef.current.monitoring.push(tradeEvent);
                setLastTrade(tradeEvent);
            } else if (finalReport.aureonReport.prismStatus === 'Gold' && Math.random() < 0.1) {
                dataStreamRef.current.monitoring.push({
                    ts: Date.now(), stage: 'signal_detected', type: 'Lighthouse Event',
                    confidence: newNexusPoint.cognitiveCapacity.toFixed(3),
                    note: 'High cross-scale coherence detected.'
                });
            }

            const finalResult: NexusAnalysisResult = { 
                ...result, 
                report: finalReport, 
                aureonData: dataStreamRef.current.aureon, 
                monitoringEvents: [...dataStreamRef.current.monitoring] 
            };
            setNexusResult(finalResult);
            
            setLiveCommentary('');
            const stream = streamLiveAnalysis(finalResult);
            for await (const chunk of stream) {
              setLiveCommentary(prev => prev + chunk);
            }
          } finally {
            analysisLockRef.current = false;
          }
        }
      },
      onError: (error) => {
        console.error("WebSocket Error:", error);
        disconnect();
      },
      onClose: () => {
        setIsConnected(false);
        webSocketRef.current = null;
        const newEvent: MonitoringEvent = { ts: Date.now(), stage: 'risk_update', note: 'WebSocket connection closed.' };
        dataStreamRef.current.monitoring.push(newEvent);
        setNexusResult(prev => {
            if (!prev) return null;
            return {
                ...prev,
                monitoringEvents: [...dataStreamRef.current.monitoring]
            }
        });
      }
    });
  }, [disconnect]);
  
  useEffect(() => {
    // ComponentWillUnmount cleanup
    return () => {
      webSocketRef.current?.close();
    }
  }, []);

  useEffect(() => {
    if (lastTrade) {
        const timer = setTimeout(() => setLastTrade(null), 5000);
        return () => clearTimeout(timer);
    }
  }, [lastTrade]);

  const handleToggleConnection = useCallback(() => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  const handleExecuteTrade = (tradeDetails: { pair: string; side: 'LONG' | 'SHORT'; size: string; price: string }) => {
    const tradeEvent: MonitoringEvent = {
        ts: Date.now(),
        stage: 'trade_executed',
        pair: tradeDetails.pair,
        side: tradeDetails.side,
        size: tradeDetails.size,
        price: tradeDetails.price,
        confidence: 'N/A (Manual)',
        source: 'Manual Override'
    };
    dataStreamRef.current.monitoring.push(tradeEvent);
    setLastTrade(tradeEvent);
    setNexusResult(prev => {
        if (!prev) return null;
        return {
            ...prev,
            monitoringEvents: [...dataStreamRef.current.monitoring]
        }
    });
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      transcriptionSessionRef.current?.close();
      setIsRecording(false);
    } else {
      try {
        const session = await startTranscriptionSession({
          onTranscriptionUpdate: (text) => setChatInput(prev => prev + text),
          onError: (error) => {
            console.error("Transcription error:", error);
            setIsRecording(false);
            transcriptionSessionRef.current = null;
          },
          onEnd: () => {
            setIsRecording(false);
            transcriptionSessionRef.current = null;
          }
        });
        transcriptionSessionRef.current = session;
        setIsRecording(true);
      } catch (error) {
        console.error("Failed to start recording:", error);
        alert("Could not start microphone. Please check permissions and try again.");
      }
    }
  };

  const handleSendMessage = async () => {
    if (isChatLoading || !nexusResult || !chatInput.trim()) return;

    const message = chatInput;
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(newMessages);
    setChatInput('');

    setIsChatLoading(true);
    let aiResponse = '';
    let sources: GroundingSource[] = [];
    
    setChatMessages(prev => [...prev, { role: 'model', content: '', sources: [] }]);

    try {
      const historyForAPI = newMessages.slice(0, -1);
      const stream = streamChatResponse(message, historyForAPI, nexusResult, isThinkingMode);
      
      for await (const chunk of stream) {
        aiResponse += chunk.text;
        if (chunk.sources && chunk.sources.length > 0) {
            chunk.sources.forEach(source => {
                if (!sources.some(s => s.uri === source.uri)) {
                    sources.push(source);
                }
            });
        }
        setChatMessages(prev => {
          const updatedMessages = [...prev];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if(lastMessage) {
            lastMessage.content = aiResponse;
            lastMessage.sources = [...sources];
          }
          return updatedMessages;
        });
      }
    } catch (error) {
        console.error("Chat error:", error);
        setChatMessages(prev => {
            const updatedMessages = [...prev];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if(lastMessage) {
                lastMessage.content = 'Sorry, I encountered a data stream error.';
            }
            return updatedMessages;
        });
    } finally {
      setIsChatLoading(false);
    }
  };

  const historicalPerfData = nexusResult ? runBacktest(nexusResult.historicalData).performanceData : [];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      {lastTrade && <TradeNotification trade={lastTrade} />}
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="text-center">
          <button
            onClick={handleToggleConnection}
            className={`font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 ${
              isConnected 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600'
            }`}
          >
            {isConnected ? 'DISCONNECT DATASTREAM' : 'ACTIVATE TRADING ALGORITHMS'}
          </button>
        </div>
        
        {isConnected || nexusResult ? (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <ReportCard report={nexusResult?.report ?? null} />
              <AureonReportCard report={nexusResult?.report?.aureonReport ?? null} />
              <LiveAnalysisStream commentary={liveCommentary} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChatPanel 
                  messages={chatMessages} 
                  onSendMessage={handleSendMessage} 
                  isLoading={isChatLoading} 
                  isThinkingMode={isThinkingMode} 
                  onToggleThinkingMode={setIsThinkingMode}
                  isRecording={isRecording}
                  onToggleRecording={handleToggleRecording}
                  inputValue={chatInput}
                  onInputChange={setChatInput}
                />
                <MonitoringPanel events={nexusResult?.monitoringEvents ?? []} />
            </div>

             <div className="mt-8 pt-6 border-t border-gray-700">
                <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 mb-6">Layer 2: QGITA Quantum Detection Engine</h2>
                <ChartContainer title="QGITA Primary Indicators">
                    <AureonChart data={displayData.aureon} />
                </ChartContainer>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
                <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-400 mb-6">Layer 6: Real-Time Analytics & Performance</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartContainer title="Portfolio Performance (Backtest)">
                        <HistoricalCoherenceChart data={historicalPerfData} />
                    </ChartContainer>
                    <ChartContainer title="Lighthouse Event Monitor (LHE)">
                        <CoherenceTrajectoryChart data={displayData.nexus} dejaVuEvents={nexusResult?.dejaVuEvents ?? []} />
                    </ChartContainer>
                    <ChartContainer title="Market Internals: Order Book Pressure">
                        <DrivingForcesChart data={displayData.nexus} />
                    </ChartContainer>
                    <ChartContainer title="Social Hype Index">
                        <SporeConcentrationChart data={displayData.nexus} />
                    </ChartContainer>
                </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
                 <h2 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-500 mb-6">System Status & Controls</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <APIKeyManager 
                      isApiActive={isApiActive}
                      onToggleApiStatus={() => setIsApiActive(!isApiActive)}
                  />
                  <TradeControls 
                      onExecuteTrade={handleExecuteTrade}
                      isApiActive={isApiActive}
                  />
                </div>
                <div className="mt-6">
                    <TechnologyRoadmap currentDay={nexusResult?.report.daysSimulated ?? 0} />
                </div>
            </div>
          </>
        ) : (
          <div className="text-center p-16 bg-gray-800/50 border border-gray-700 rounded-lg mt-6">
            <h2 className="text-2xl font-semibold text-gray-300">AQTS is Standing By</h2>
            <p className="text-gray-400 mt-2 max-w-xl mx-auto">Click "Activate Trading Algorithms" to engage the QGITA engine and begin live market analysis.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
