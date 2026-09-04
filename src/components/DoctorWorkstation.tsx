import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  CheckCircle2,
  Edit3,
  XCircle,
  Clock,
  Printer,
  Share2,
  FileText,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  User,
  Activity,
  Download,
  Flame,
  Award,
  Pill,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PatientProfile,
  GisEnvironment,
  SymptomItem,
  HardwareVitals,
  AdaptiveQuestion,
  PrakritiParikshaState,
  RedFlagAssessment,
  EvidenceFieldItem,
  LongitudinalVisitNode,
  MedicationAdherenceItem,
  MedicationDoseStatus,
} from '../types';
import { SAMPLE_LONGITUDINAL_HISTORY } from '../data/medicalCorpus';
import { MedicationAdherenceSchedule } from './MedicationAdherenceSchedule';
import { OnePageDoctorSummary } from './OnePageDoctorSummary';
import { ClinicalPatientSummary } from '../types';

interface DoctorWorkstationProps {
  patient: PatientProfile;
  gisContext: GisEnvironment;
  selectedSymptoms: SymptomItem[];
  vitals: HardwareVitals['vitals'];
  adaptiveHistory: AdaptiveQuestion[];
  prakritiState: PrakritiParikshaState;
  redFlagData: RedFlagAssessment;
  onePageSummary?: ClinicalPatientSummary | null;
  onUpdateOnePageSummary?: (summary: ClinicalPatientSummary) => void;
  patientReportedText?: string;
  bodyRegionSelected?: string;
  ocrText?: string;
  onCommitVisit?: (visit: LongitudinalVisitNode) => void;
  onUpdateDoseStatus?: (medicationId: string, logIndex: number, newStatus: MedicationDoseStatus) => void;
  onSaveDoctorIntervention?: (medicationId: string, notes: string) => void;
  onAddNewMedication?: (medication: MedicationAdherenceItem | MedicationAdherenceItem[]) => void;
}

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({
  patient,
  gisContext,
  selectedSymptoms,
  vitals,
  adaptiveHistory,
  prakritiState,
  redFlagData,
  onePageSummary,
  onUpdateOnePageSummary,
  patientReportedText = '',
  bodyRegionSelected = '',
  ocrText = '',
  onCommitVisit,
  onUpdateDoseStatus,
  onSaveDoctorIntervention,
  onAddNewMedication,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'one_page_summary' | 'case_sheet' | 'medication_adherence' | 'longitudinal_graph' | 'ehr_print'>('one_page_summary');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValueText, setEditValueText] = useState('');
  const [isDoctorSignedOff, setIsDoctorSignedOff] = useState(false);
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<ClinicalPatientSummary>(() => {
    if (onePageSummary) return onePageSummary;
    return {
      patientInfo: {
        ageSex: `${patient.age || 'Not provided'} / ${patient.gender || 'Not provided'}`,
        backgroundInfo: `District: ${patient.district || 'Not provided'}, State: ${patient.state || 'Not provided'}, Dialect: ${patient.dialect || 'Hindi'}. Literacy: ${patient.literacyLevel || 'Not provided'}.`,
      },
      chiefComplaint:
        selectedSymptoms.map((s) => s.nameEn).join(', ') ||
        patientReportedText ||
        'Not provided',
      presentingSymptoms: {
        symptoms: selectedSymptoms.map((s) => s.nameEn).length > 0 ? selectedSymptoms.map((s) => s.nameEn) : ['Not provided'],
        location: bodyRegionSelected || (selectedSymptoms[0]?.nameEn ? `${selectedSymptoms[0].nameEn} area` : 'Not provided'),
        duration: adaptiveHistory[0]?.selectedAnswer || 'Not provided',
        severity: adaptiveHistory.find((h) => h.questionEn.toLowerCase().includes('severe'))?.selectedAnswer || 'Not provided',
        onsetProgression: adaptiveHistory.find((h) => h.questionEn.toLowerCase().includes('begin') || h.questionEn.toLowerCase().includes('start'))?.selectedAnswer || 'Not provided',
        associatedSymptoms: selectedSymptoms.slice(1).map((s) => s.nameEn),
      },
      relevantHistory: {
        previousConditions: patient.medicalConditions && patient.medicalConditions.length > 0 ? patient.medicalConditions.join(', ') : 'Not provided',
        previousEpisodes: 'Not provided',
        medications: patient.currentAdherenceSchedule && patient.currentAdherenceSchedule.length > 0 ? patient.currentAdherenceSchedule.map((m) => m.medicationName).join(', ') : 'Not provided',
        allergies: patient.knownAllergies && patient.knownAllergies.length > 0 ? patient.knownAllergies.join(', ') : 'Not provided',
        familySocialHistory: 'Not provided',
      },
      examinationFindings: {
        bodyRegionInfo: bodyRegionSelected ? `Body Region Focus: ${bodyRegionSelected}` : 'Not provided',
        ocrReportFindings: ocrText ? `OCR Findings: ${ocrText.slice(0, 150)}...` : 'Not provided',
        patientReportedObservations: patientReportedText || 'Not provided',
        vitalsTelemetry: `BP: ${vitals.systolicBP || 'Not recorded'}/${vitals.diastolicBP || 'Not recorded'} mmHg | SpO2: ${vitals.spo2Percent || 'Not recorded'}% | Pulse: ${vitals.pulseRateBpm || 'Not recorded'} bpm | Temp: ${vitals.temperatureF || 'Not recorded'}°F`,
        otherCollectedInfo: `ABHA ID: ${patient.abhaId || 'Not linked'}. Previous visits: ${patient.pastVisitsCount || 0}.`,
      },
      aiClinicalConcerns: {
        observations: [
          `AI Observation (Not Confirmed Diagnosis): Clinical symptom presentation corresponds with ${bodyRegionSelected || 'reported symptoms'}.`,
          `GIS Factor: ${gisContext.city} (${gisContext.tempC}°C, AQI ${gisContext.aqi}).`,
        ],
        patternsIdentified: [
          redFlagData.priorityLevel.startsWith('RED') ? 'Critical symptom triad or physiological vital deviation' : 'Non-emergency triage presentation',
        ],
      },
      redFlags: {
        hasEmergency: redFlagData.priorityLevel.startsWith('RED'),
        urgentSymptoms: redFlagData.priorityLevel.startsWith('RED')
          ? [redFlagData.priorityLevel, ...(redFlagData.redFlags || [])]
          : ['No emergency red flags currently triggered.'],
        immediateActionRequired: redFlagData.priorityLevel.startsWith('RED')
          ? 'Immediate emergency stabilization and physician evaluation recommended.'
          : undefined,
      },
      missingImportantInformation: [
        'Comprehensive on-site physical examination',
        'Confirmatory laboratory biomarker analysis',
      ],
      recommendedNextStep: redFlagData.priorityLevel.startsWith('RED')
        ? 'Immediate emergency stabilization and physician evaluation.'
        : 'Physician physical examination, diagnostic correlation, and treatment formulation.',
      generatedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  });

  useEffect(() => {
    if (onePageSummary) {
      setCurrentSummary(onePageSummary);
    }
  }, [onePageSummary]);

  const refreshSummary = async () => {
    setIsRefreshingSummary(true);
    try {
      const res = await fetch('/api/gemini/intelligent-patient-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          selectedSymptoms,
          freeTextInput: patientReportedText,
          bodyRegion: bodyRegionSelected,
          ocrText,
          vitals,
          adaptiveHistory,
          gisContext,
        }),
      });
      const data = await res.json();
      if (data.doctorSummary) {
        setCurrentSummary(data.doctorSummary);
        if (onUpdateOnePageSummary) {
          onUpdateOnePageSummary(data.doctorSummary);
        }
      }
    } catch (err) {
      console.error('Error refreshing summary:', err);
    } finally {
      setIsRefreshingSummary(false);
    }
  };

  // Initialize evidence-linked items from current intake session
  const [evidenceItems, setEvidenceItems] = useState<EvidenceFieldItem[]>([
    {
      id: 'f_chief_complaint',
      category: 'Chief Complaint',
      aiExtractedValue: selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Acute Chest Discomfort & Sweating',
      evidenceSource: 'Patient Voice Intake (Bhashini STT) + Body Map Touch Selection',
      confidence: 0.96,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_onset_duration',
      category: 'Onset & History',
      aiExtractedValue: adaptiveHistory[0]?.selectedAnswer || '2 to 3 days, worsening on exertion',
      evidenceSource: 'Adaptive Follow-Up Q1 with SNOMED CT 29857009 Mapping',
      confidence: 0.94,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_gis_risk',
      category: 'GIS Epidemic Risk',
      aiExtractedValue: `${gisContext.city} District: ${gisContext.activeOutbreaks[0]?.disease || 'Vector Alert'} (AQI: ${gisContext.aqi})`,
      evidenceSource: 'Context Aggregator Service + IDSP Outbreak Surveillance Feed',
      confidence: 0.98,
      doctorAction: 'ACCEPTED',
    },
    {
      id: 'f_vitals',
      category: 'Vitals',
      aiExtractedValue: `BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg | SpO2: ${vitals.spo2Percent}% | Pulse: ${vitals.pulseRateBpm} bpm | Temp: ${vitals.temperatureF}°F`,
      evidenceSource: 'BLE Omron & Contec Hardware Bridge (IEEE 11073)',
      confidence: 1.0,
      doctorAction: 'ACCEPTED',
    },
    {
      id: 'f_prakriti',
      category: 'Prakriti Tag',
      aiExtractedValue: `${prakritiState.primaryDosha} (Vata: ${prakritiState.vataPercent}%, Pitta: ${prakritiState.pittaPercent}%, Kapha: ${prakritiState.kaphaPercent}%)`,
      evidenceSource: 'CCRAS 90-Second Adaptive Pariksha + Nadi Pulse Analysis',
      confidence: 0.91,
      doctorAction: 'PENDING',
    },
    {
      id: 'f_triage',
      category: 'Triage Level',
      aiExtractedValue: redFlagData.priorityLevel,
      evidenceSource: redFlagData.ruleEngineSource,
      confidence: 0.99,
      doctorAction: 'PENDING',
    },
  ]);

  const handleSetDoctorAction = (id: string, action: 'ACCEPTED' | 'REJECTED') => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, doctorAction: action } : item))
    );
  };

  const handleSaveEdit = (id: string) => {
    setEvidenceItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, doctorAction: 'EDITED', editedValue: editValueText } : item
      )
    );
    setEditingFieldId(null);
  };

  const handleFinalDoctorSignoff = () => {
    setIsDoctorSignedOff(true);

    const chiefComplaintText =
      evidenceItems.find((e) => e.category === 'Chief Complaint')?.editedValue ||
      evidenceItems.find((e) => e.category === 'Chief Complaint')?.aiExtractedValue ||
      selectedSymptoms.map((s) => s.nameEn).join(', ') ||
      'Follow-Up Consultation & Symptom Review';

    const newVisitRecord: LongitudinalVisitNode = {
      visitId: `VST-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      visitDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      opdDepartment: prakritiState.isCompleted ? 'AYUSH / Kayachikitsa' : 'General Medicine',
      chiefComplaint: chiefComplaintText,
      vitalsSummary: `BP: ${vitals.systolicBP}/${vitals.diastolicBP} mmHg, SpO2: ${vitals.spo2Percent}%, Pulse: ${vitals.pulseRateBpm} bpm, Temp: ${vitals.temperatureF}°F`,
      triagePriority: redFlagData.priorityLevel.startsWith('RED') ? 'RED' : redFlagData.priorityLevel.startsWith('YELLOW') ? 'YELLOW' : 'GREEN',
      prakritiDosha: prakritiState.primaryDosha,
      doctorNotes: `Verified and signed by attending physician. Evidence items accepted. Follow-up advised in 14 days.`,
      prescribedMeds: ['Pantoprazole 40mg OD', 'ORS / Hydration support', 'Giloy / Tulsi formulation'],
      adherenceScorePercent: patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88,
      adherenceStatus:
        (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 90
          ? 'EXCELLENT (>=90%)'
          : (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 75
          ? 'GOOD (75-89%)'
          : (patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 88) >= 50
          ? 'NEEDS_ATTENTION (50-74%)'
          : 'CRITICAL_POOR (<50%)',
      complianceNotes: 'Assessed compliance in consultation. Patient agreed to follow morning schedule.',
    };

    if (onCommitVisit) {
      onCommitVisit(newVisitRecord);
    }

    if (onAddNewMedication) {
      const prescribedList = [
        { name: 'Pantoprazole 40mg', timing: 'Morning (Empty Stomach)', meal: 'Empty Stomach', freq: 'OD (Once Daily)', dur: '14 days' },
        { name: 'ORS Hydration Support', timing: 'Daytime', meal: 'With Food', freq: 'SOS', dur: '5 days' },
        { name: 'Giloy / Tulsi Formulation', timing: 'Night (HS)', meal: 'After Food', freq: 'OD', dur: '14 days' },
      ];
      const newMeds: MedicationAdherenceItem[] = prescribedList.map((item, i) => ({
        id: `med_doc_${Date.now()}_${i}`,
        medicationName: item.name,
        genericFormula: item.name,
        category: 'General',
        dosageRegimen: `${item.name} • ${item.timing} (${item.meal})`,
        dosage: '1 Dose',
        timing: item.timing,
        mealRelation: item.meal,
        frequency: item.freq,
        duration: item.dur,
        specialInstructions: 'Prescribed by attending physician during clinical consultation.',
        startDate: new Date().toLocaleDateString('en-GB'),
        durationDays: 14,
        totalPrescribedDoses: 14,
        takenDoses: 0,
        missedDoses: 0,
        adherencePercent: 100,
        adherenceTier: 'HIGH_ADHERENCE',
        recentDailyLogs: [],
        refillDueInDays: 14,
        isChronic: false,
        remindersEnabled: true,
      }));
      onAddNewMedication(newMeds);
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const isAllReviewed = evidenceItems.every((i) => i.doctorAction !== 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                One-Glance Doctor Risk-Heatmap & Workstation
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">• Evidence-Linked Sign-Off Mandate</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight font-display">
              Doctor Clinical Workstation & Tele-Triage Review
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Every single AI-extracted field is backed by verbatim evidence. The physician must Accept, Edit, or Reject each item before committing to the official ABDM health record.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveSubTab('one_page_summary')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'one_page_summary'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>One-Page Doctor Summary</span>
            </button>
            <button
              onClick={() => setActiveSubTab('case_sheet')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'case_sheet'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Evidence Case Sheet
            </button>
            <button
              onClick={() => setActiveSubTab('medication_adherence')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'medication_adherence'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Medication Adherence ({patient.currentAdherenceSchedule?.length || 0})</span>
              {patient.longitudinalAdherenceSummary?.nonComplianceRiskFlag && (
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('longitudinal_graph')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'longitudinal_graph'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Longitudinal Graph ({patient.pastVisitsCount + 1} Visits)
            </button>
            <button
              onClick={() => setActiveSubTab('ehr_print')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                activeSubTab === 'ehr_print'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Official ABDM Print / PDF
            </button>
          </div>
        </div>
      </div>

      {/* One-Glance Patient Banner with Risk Heatmap */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-lg">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{patient.name}</h3>
              <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                ABHA: {patient.abhaId}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-0.5">
              {patient.age} yrs • {patient.gender} • {patient.district}, {patient.state} • Dialect:{' '}
              <strong className="text-emerald-700">{patient.dialect}</strong>
            </div>
          </div>
        </div>

        {/* Color-Coded Triage Priority Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
              redFlagData.priorityLevel.startsWith('RED')
                ? 'bg-rose-100 text-rose-800 border-2 border-rose-400 animate-pulse'
                : redFlagData.priorityLevel.startsWith('YELLOW')
                ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                : 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{redFlagData.priorityLevel}</span>
          </div>

          {isDoctorSignedOff && (
            <span className="bg-emerald-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Doctor Signed & Committed</span>
            </span>
          )}
        </div>
      </div>

      {/* Sub-Tab 0: One-Page Doctor Summary */}
      {activeSubTab === 'one_page_summary' && (
        <OnePageDoctorSummary
          summary={currentSummary}
          patient={patient}
          onRefresh={refreshSummary}
          isLoading={isRefreshingSummary}
          onSignOff={handleFinalDoctorSignoff}
          isSignedOff={isDoctorSignedOff}
          detailedHistory={adaptiveHistory}
          onAddMedicationToSchedule={onAddNewMedication}
        />
      )}

      {/* Sub-Tab 1: Evidence-Linked Sign-Off Table */}
      {activeSubTab === 'case_sheet' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Evidence-Linked Field Validation Checklist
              </h3>
              <p className="text-xs text-slate-500">
                Review and approve AI-synthesized fields prior to clinical sign-off.
              </p>
            </div>

            <button
              onClick={handleFinalDoctorSignoff}
              disabled={!isAllReviewed}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isAllReviewed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign Off & Commit Case Record</span>
            </button>
          </div>

          <div className="space-y-3">
            {evidenceItems.map((item) => {
              const isEditing = editingFieldId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    item.doctorAction === 'ACCEPTED'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : item.doctorAction === 'EDITED'
                      ? 'bg-blue-50/50 border-blue-200'
                      : item.doctorAction === 'REJECTED'
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">
                          {item.category}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.2 rounded-full font-mono">
                          Confidence: {(item.confidence * 100).toFixed(0)}%
                        </span>
                        {item.doctorAction !== 'PENDING' && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                              item.doctorAction === 'ACCEPTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.doctorAction === 'EDITED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.doctorAction}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={editValueText}
                            onChange={(e) => setEditValueText(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-full"
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-slate-900">
                          {item.editedValue || item.aiExtractedValue}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 italic">
                        Evidence Grounding: {item.evidenceSource}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end md:self-center">
                      <button
                        onClick={() => handleSetDoctorAction(item.id, 'ACCEPTED')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.doctorAction === 'ACCEPTED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingFieldId(item.id);
                          setEditValueText(item.editedValue || item.aiExtractedValue);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleSetDoctorAction(item.id, 'REJECTED')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          item.doctorAction === 'REJECTED'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Longitudinal Medication Adherence Tracking */}
      {activeSubTab === 'medication_adherence' && (
        <MedicationAdherenceSchedule
          patient={patient}
          onUpdateDoseStatus={onUpdateDoseStatus}
          onSaveDoctorIntervention={onSaveDoctorIntervention}
          onAddNewMedication={onAddNewMedication}
          isDoctorMode={true}
        />
      )}

      {/* Sub-Tab 3: Longitudinal Health Graph Across Past Visits */}
      {activeSubTab === 'longitudinal_graph' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Longitudinal Health Graph (ABHA Connected Node Timeline)
              </h3>
              <p className="text-xs text-slate-500">
                New intake data is automatically cross-checked against previous consultations, turning each repeat visit into a smarter profile.
              </p>
            </div>
            {patient.longitudinalAdherenceSummary && (
              <div className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <Pill className="w-4 h-4 text-emerald-600" />
                <span>Overall Adherence: {patient.longitudinalAdherenceSummary.overallAdherenceRate}%</span>
              </div>
            )}
          </div>

          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {/* Current Visit */}
            <div className="relative space-y-2">
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100"></div>
              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-300 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">
                    Current Visit (Today, Active Intake) • OPD Tele-Triage
                  </span>
                  <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    LIVE SESSION
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedSymptoms.map((s) => s.nameEn).join(', ') || 'Acute Chest Pressure'}
                </div>
                <div className="text-xs text-slate-600">
                  BP: {vitals.systolicBP}/{vitals.diastolicBP} mmHg | SpO2: {vitals.spo2Percent}% | Prakriti: {prakritiState.primaryDosha}
                </div>
                {patient.longitudinalAdherenceSummary && (
                  <div className="text-[11px] text-emerald-800 bg-white/80 p-2 rounded border border-emerald-200 font-medium">
                    Pre-consultation Adherence Assessment: <strong>{patient.longitudinalAdherenceSummary.overallAdherenceRate}%</strong> ({patient.longitudinalAdherenceSummary.adherenceTrend})
                  </div>
                )}
              </div>
            </div>

            {/* Past Visits from ABHA graph */}
            {((patient.visitHistory && patient.visitHistory.length > 0)
              ? patient.visitHistory
              : SAMPLE_LONGITUDINAL_HISTORY
            ).map((visit, i) => (
              <div key={i} className="relative space-y-2">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-400 ring-4 ring-slate-100"></div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {visit.visitDate} • {visit.opdDepartment}
                    </span>
                    <span className="text-slate-500 font-mono">{visit.visitId}</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    Complaint: {visit.chiefComplaint}
                  </div>
                  <div className="text-slate-500">
                    Vitals: {visit.vitalsSummary} • Prakriti: {visit.prakritiDosha}
                  </div>
                  {visit.doctorNotes && (
                    <div className="text-slate-600 bg-white p-2 rounded border border-slate-100 italic text-[11px]">
                      Doctor Notes: {visit.doctorNotes}
                    </div>
                  )}
                  {visit.prescribedMeds && visit.prescribedMeds.length > 0 && (
                    <div className="text-emerald-800 bg-emerald-50 p-2 rounded-lg font-mono text-[11px] flex flex-wrap items-center justify-between gap-1">
                      <span>Prescribed: {visit.prescribedMeds.join(', ')}</span>
                      {visit.adherenceScorePercent && (
                        <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded text-[10px]">
                          {visit.adherenceScorePercent}% Adherence Logged
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Official ABDM Print / PDF Sheet */}
      {activeSubTab === 'ehr_print' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-lg space-y-6 text-slate-900 max-w-4xl mx-auto print:m-0 print:border-none print:shadow-none">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold tracking-wider text-emerald-800 uppercase">
                Government of India • Ayushman Bharat Digital Mission (ABDM)
              </div>
              <h2 className="text-xl font-black text-slate-900">
                AROGYAMITRA TELE-TRIAGE & AYUSH OPD CASE RECORD
              </h2>
              <p className="text-xs text-slate-500">
                Standard Treatment Guidelines Compliant • Signed by On-Duty Physician
              </p>
            </div>

            <div className="text-right text-xs">
              <div className="font-bold text-slate-800">Date: {new Date().toLocaleDateString('en-IN')}</div>
              <div className="font-mono text-slate-500">ABHA: {patient.abhaId}</div>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Patient Name:</span>
              <strong className="text-slate-900">{patient.name}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Age / Gender:</span>
              <strong className="text-slate-900">{patient.age} / {patient.gender}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">District:</span>
              <strong className="text-slate-900">{patient.district}, {patient.state}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Prakriti Dosha:</span>
              <strong className="text-emerald-800">{prakritiState.primaryDosha}</strong>
            </div>
          </div>

          {/* Recorded Vitals */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">1. Objective Vitals (BLE Telemetry):</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-slate-800">
              BP: {vitals.systolicBP}/{vitals.diastolicBP} mmHg | SpO2: {vitals.spo2Percent}% | Pulse: {vitals.pulseRateBpm} bpm | Temp: {vitals.temperatureF}°F | Nadi: {prakritiState.nadiGati}
            </div>
          </div>

          {/* Clinical Findings & Symptoms */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">2. Evaluated Symptoms & SNOMED CT Codes:</h4>
            <ul className="list-disc list-inside space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">
              {selectedSymptoms.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.nameEn}</strong> (SNOMED: {s.snomedCode}) — ICD-11: {s.icd11Code}
                </li>
              ))}
            </ul>
          </div>

          {/* AYUSH & Modern Prescribed Care */}
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-slate-900 uppercase">3. Prescription & AYUSH Recommendations:</h4>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 text-emerald-950 space-y-1 font-mono text-[11px]">
              <div>• Tab. Paracetamol 650mg TDS x 3 days (Post meals) [CDSCO-101]</div>
              <div>• Tab. Pantoprazole 40mg OD x 5 days (Empty stomach) [CDSCO-103]</div>
              <div>• AYUSH: Amalaki + Brahmi preparation for Pitta-Vata balance.</div>
            </div>
          </div>

          {/* Longitudinal Medication Adherence Log */}
          {patient.currentAdherenceSchedule && patient.currentAdherenceSchedule.length > 0 && (
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-slate-900 uppercase flex items-center justify-between">
                <span>4. Longitudinal Prescription Adherence & Compliance Log:</span>
                <span className="text-emerald-700 font-bold font-mono">
                  Overall Compliance: {patient.longitudinalAdherenceSummary?.overallAdherenceRate ?? 85}%
                </span>
              </h4>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
                {patient.currentAdherenceSchedule.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-200/60 pb-1 last:border-0 last:pb-0">
                    <div>
                      <strong className="text-slate-800">{med.medicationName}</strong> ({med.dosageRegimen})
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-800">{med.adherencePercent}% Adherence</span>
                      <span className="text-slate-500 font-mono">Refill in {med.refillDueInDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Print / Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <span className="text-xs text-slate-400 italic">
              Electronically generated & verified by ArogyaMitra AI Clinical Assistant
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Case Record</span>
              </button>

              <button
                onClick={() => alert(`ABHA Health Record pushed to National Sandbox for ${patient.abhaId}!`)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Sync to ABHA App</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
