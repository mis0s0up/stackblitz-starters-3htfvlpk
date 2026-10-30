'use client';

import React, { useState } from 'react';

// 타입 정의
interface WishItem {
  id: string;
  text: string;
  createdDate: string;
}

interface Member {
  id: string;
  name: string;
  pin: string; // 개인 PIN 비밀번호 (몰래보기 방지용)
  keyIcon: string;
  keyShared: boolean;
  wishes: WishItem[];
}

interface Anniversary {
  title: string;
  date: string;
}

interface RoomData {
  roomName: string;
  password: string;
  mode: 'couple' | 'friends';
  theme: string;
  meetingDate: string;
  meetingPlace: string;
  dates: Anniversary[];
  members: Member[];
  currentUserId: string;
  unboxed: boolean;
}

const STORAGE_KEY_PREFIX = 'LONGDI_ROOM_';

export default function LongDistanceApp() {
  const [authStep, setAuthStep] = useState<
    'choice' | 'login' | 'setup-basic' | 'setup-meeting' | 'none'
  >('choice');
  const [mode, setMode] = useState<'couple' | 'friends'>('couple');

  // 방 기본 설정
  const [roomNameInput, setRoomNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // 멤버 이름 및 멤버별 개인 PIN (기본 4자리 0000)
  const [memberInputs, setMemberInputs] = useState<
    { name: string; pin: string }[]
  >([
    { name: '애기 1', pin: '1234' },
    { name: '애기 2', pin: '5678' },
  ]);
  const [dateInputs, setDateInputs] = useState<Anniversary[]>([
    { title: '우리가 만난 날', date: '' },
  ]);

  // 다음 만남 설정
  const [meetingDateInput, setMeetingDateInput] = useState('');
  const [meetingPlaceInput, setMeetingPlaceInput] = useState('');

  // 로그인 폼
  const [loginRoomName, setLoginRoomName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 프로필 전환 PIN 검증 모달 State
  const [targetUserToSwitch, setTargetUserToSwitch] = useState<Member | null>(
    null
  );
  const [pinPromptInput, setPinPromptInput] = useState('');
  const [pinError, setPinError] = useState('');

  // 전체 앱 State
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [theme, setTheme] = useState<string>('theme-butter-blue');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [newWishText, setNewWishText] = useState('');
  const [testD1Mode, setTestD1Mode] = useState(false);
  const [activeTabUserId, setActiveTabUserId] = useState<string>('');
  const [draggedWishIndex, setDraggedWishIndex] = useState<number | null>(null);

  const persistRoomData = (data: RoomData) => {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + data.roomName,
      JSON.stringify(data)
    );
    setRoomData({ ...data });
  };

  const handleSelectMode = (selectedMode: 'couple' | 'friends') => {
    setMode(selectedMode);
    if (selectedMode === 'couple') {
      setMemberInputs([
        { name: '애기 1', pin: '' },
        { name: '애기 2', pin: '' },
      ]);
    } else {
      setMemberInputs([
        { name: '친구 1', pin: '' },
        { name: '친구 2', pin: '' },
        { name: '친구 3', pin: '' },
      ]);
    }
    setAuthStep('setup-basic');
  };

  const handleProceedToMeetingStep = () => {
    if (!roomNameInput.trim()) return alert('방 이름을 입력해주세요.');
    if (!passwordInput.trim()) return alert('방 비밀번호를 입력해주세요.');

    // 모든 멤버의 개인 PIN 입력 여부 확인
    for (let i = 0; i < memberInputs.length; i++) {
      if (!memberInputs[i].name.trim())
        return alert(`멤버 ${i + 1}의 이름을 입력해주세요.`);
      if (!memberInputs[i].pin || memberInputs[i].pin.length < 4) {
        return alert(
          `${memberInputs[i].name}님의 개인 비밀번호(4자리)를 설정해주세요.`
        );
      }
    }
    setAuthStep('setup-meeting');
  };

  const handleFinishSetup = () => {
    const defaultIcons = ['🔑', '🗝️', '💎', '⭐', '🍀', '🍭', '🎀', '🎈'];
    const members: Member[] = memberInputs.map((m, idx) => ({
      id: `user_${idx + 1}`,
      name: m.name.trim(),
      pin: m.pin.trim(),
      keyIcon: defaultIcons[idx % defaultIcons.length],
      keyShared: false,
      wishes: [],
    }));

    const validDates = dateInputs.filter(
      (d) => d.title.trim() !== '' && d.date !== ''
    );

    const newRoom: RoomData = {
      roomName: roomNameInput.trim(),
      password: passwordInput.trim(),
      mode,
      theme,
      meetingDate: meetingDateInput,
      meetingPlace: meetingPlaceInput.trim() || '미정',
      dates: validDates,
      members,
      currentUserId: members[0].id,
      unboxed: false,
    };

    persistRoomData(newRoom);
    setCurrentUserId(members[0].id);
    setActiveTabUserId(members[0].id);
    setAuthStep('none');
  };

  const handleLogin = () => {
    setLoginError('');
    const saved = localStorage.getItem(
      STORAGE_KEY_PREFIX + loginRoomName.trim()
    );
    if (!saved) return setLoginError('해당 이름의 방을 찾을 수 없습니다.');

    try {
      const parsed: RoomData = JSON.parse(saved);
      if (parsed.password !== loginPassword.trim()) {
        return setLoginError('비밀번호가 일치하지 않습니다.');
      }
      setRoomData(parsed);
      setTheme(parsed.theme || 'theme-butter-blue');
      setCurrentUserId(parsed.members[0].id);
      setActiveTabUserId(parsed.members[0].id);
      setAuthStep('none');
    } catch {
      setLoginError('데이터를 읽어오는 중 오류가 발생했습니다.');
    }
  };

  // 프로필 전환 시 PIN 요구 로직
  const handleRequestSwitchUser = (targetUserId: string) => {
    if (!roomData || targetUserId === currentUserId) return;
    const targetMember = roomData.members.find((m) => m.id === targetUserId);
    if (!targetMember) return;

    // 만약 타겟 멤버에게 PIN이 걸려있다면 팝업 노출
    if (targetMember.pin) {
      setTargetUserToSwitch(targetMember);
      setPinPromptInput('');
      setPinError('');
    } else {
      // PIN이 없으면 바로 전환
      completeSwitchUser(targetMember.id);
    }
  };

  const handleVerifyPin = () => {
    if (!targetUserToSwitch) return;
    if (pinPromptInput === targetUserToSwitch.pin) {
      completeSwitchUser(targetUserToSwitch.id);
      setTargetUserToSwitch(null);
      setPinPromptInput('');
      setPinError('');
    } else {
      setPinError(
        '❌ 비밀번호가 일치하지 않습니다! 상대방의 위시를 몰래 볼 수 없어요.'
      );
    }
  };

  const completeSwitchUser = (userId: string) => {
    setCurrentUserId(userId);
    if (roomData) {
      persistRoomData({ ...roomData, currentUserId: userId });
    }
  };

  const currentUser =
    roomData?.members.find((m) => m.id === currentUserId) ||
    roomData?.members[0];

  const handleAddWish = () => {
    if (!newWishText.trim() || !roomData || !currentUser) return;
    const todayStr = new Date().toISOString().split('T')[0];

    const hasToday = currentUser.wishes.some((w) => w.createdDate === todayStr);
    if (hasToday) {
      alert('⚠️ 오늘은 이미 위시를 1개 등록했습니다. (매일 1개씩 추가 가능)');
      return;
    }

    const newWish: WishItem = {
      id: 'wish_' + Date.now(),
      text: newWishText.trim(),
      createdDate: todayStr,
    };

    const updatedMembers = roomData.members.map((m) => {
      if (m.id === currentUser.id)
        return { ...m, wishes: [...m.wishes, newWish] };
      return m;
    });

    persistRoomData({ ...roomData, members: updatedMembers });
    setNewWishText('');
  };

  const handleDropWish = (targetIndex: number) => {
    if (
      draggedWishIndex === null ||
      draggedWishIndex === targetIndex ||
      !roomData ||
      !currentUser
    )
      return;
    const clonedWishes = [...currentUser.wishes];
    const [moved] = clonedWishes.splice(draggedWishIndex, 1);
    clonedWishes.splice(targetIndex, 0, moved);

    const updatedMembers = roomData.members.map((m) => {
      if (m.id === currentUser.id) return { ...m, wishes: clonedWishes };
      return m;
    });

    persistRoomData({ ...roomData, members: updatedMembers });
    setDraggedWishIndex(null);
  };

  const handleToggleKey = () => {
    if (!roomData || !currentUser) return;
    const updatedMembers = roomData.members.map((m) => {
      if (m.id === currentUser.id) return { ...m, keyShared: !m.keyShared };
      return m;
    });

    const allShared = updatedMembers.every((m) => m.keyShared);
    persistRoomData({
      ...roomData,
      members: updatedMembers,
      unboxed: allShared ? true : roomData.unboxed,
    });
  };

  const getDDayInfo = () => {
    if (!roomData?.meetingDate) return { text: 'D-Day 미설정', diff: 999 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(roomData.meetingDate);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 0) return { text: 'D-DAY 오늘 만나요! 🎉', diff };
    if (diff === 1) return { text: 'D-1 내일 만나요! 🗝️', diff };
    if (diff > 1) return { text: `D-${diff}`, diff };
    return { text: `D+${Math.abs(diff)} (지남)`, diff };
  };

  const dDayInfo = getDDayInfo();
  const canUnlockNow = testD1Mode || dDayInfo.diff <= 1;

  return (
    <div
      className={`min-h-screen pb-20 ${
        theme === 'theme-butter-blue'
          ? 'bg-[#FFFDF0] text-[#1E293B]'
          : theme === 'theme-pink-blue'
          ? 'bg-[#FFF5F7] text-[#1F2937]'
          : 'bg-[#F3F4F6] text-[#111827]'
      }`}
    >
      {/* ================= 프로필 전환 시 개인 PIN 인증 모달 ================= */}
      {targetUserToSwitch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl text-gray-900">
            <span className="text-4xl">🔒</span>
            <h3 className="text-lg font-black mt-2">비밀 보관함 잠금</h3>
            <p className="text-xs text-gray-500 mt-1">
              <strong>{targetUserToSwitch.name}</strong>님의 위시 보관함입니다.
              <br />
              본인 확인을 위해 개인 PIN(비밀번호 4자리)을 입력하세요.
            </p>

            <div className="my-4">
              <input
                type="password"
                maxLength={8}
                value={pinPromptInput}
                onChange={(e) => setPinPromptInput(e.target.value)}
                placeholder="PIN 4자리 입력"
                className="w-full text-center tracking-widest text-lg py-2.5 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPin()}
                autoFocus
              />
              {pinError && (
                <p className="text-[11px] text-red-500 mt-2 font-medium">
                  {pinError}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setTargetUserToSwitch(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={handleVerifyPin}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-md"
              >
                잠금 해제 🔓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 온보딩 & 방 생성 모달 ================= */}
      {authStep !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-gray-900">
            <div className="text-center mb-6">
              <span className="text-3xl">🗝️</span>
              <h1 className="text-2xl font-black mt-2">빙그레의 롱디동지</h1>
              <p className="text-xs text-gray-500 mt-1">
                서로의 위시는 D-1 전까지 안전하게 비밀로 보호됩니다.
              </p>
            </div>

            {authStep === 'choice' && (
              <div className="space-y-4">
                <button
                  onClick={() => handleSelectMode('couple')}
                  className="w-full p-5 rounded-2xl border-2 border-pink-200 hover:border-pink-500 bg-pink-50/50 hover:bg-pink-50 text-left transition-all"
                >
                  <span className="text-xs font-bold text-pink-600 uppercase">
                    MODE 01
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                    👩‍❤️‍👨 커플용 시작하기
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    상대가 못 보게 할 개인 PIN 4자리 설정
                  </p>
                </button>

                <button
                  onClick={() => handleSelectMode('friends')}
                  className="w-full p-5 rounded-2xl border-2 border-blue-200 hover:border-blue-500 bg-blue-50/50 hover:bg-blue-50 text-left transition-all"
                >
                  <span className="text-xs font-bold text-blue-600 uppercase">
                    MODE 02
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-0.5">
                    👭 친구 모임용 시작하기
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    각자의 개인 PIN 설정
                  </p>
                </button>

                <button
                  onClick={() => setAuthStep('login')}
                  className="w-full py-3.5 border border-gray-300 hover:bg-gray-50 rounded-2xl text-xs font-bold text-gray-700 transition-all"
                >
                  기존 방 데이터 불러오기
                </button>
              </div>
            )}

            {/* STEP 1: 기본 정보 및 각자 개인 PIN 설정 */}
            {authStep === 'setup-basic' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-lg font-black">
                    {mode === 'couple' ? '👩‍❤️‍👨 커플 방 설정' : '👭 친구 방 설정'}
                  </h2>
                  <button
                    onClick={() => setAuthStep('choice')}
                    className="text-xs text-gray-400"
                  >
                    이전
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    방 이름
                  </label>
                  <input
                    type="text"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    placeholder="예: 애기들"
                    className="w-full px-4 py-2 text-sm border rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    방 전체 비밀번호 (입장용)
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="방 비밀번호"
                    className="w-full px-4 py-2 text-sm border rounded-xl outline-none"
                  />
                </div>

                {/* 각자 애칭 및 개인 PIN (몰래보기 방지 핵심!) */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-amber-900">
                        🔒 몰래보기 방지용 개인 PIN 설정
                      </span>
                      <p className="text-[10px] text-amber-700">
                        각자 4자리 비번을 정해 상대방이 내 위시를 훔쳐보지
                        못하게 합니다.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {memberInputs.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-center bg-white p-2 rounded-xl border border-amber-100"
                      >
                        <span className="text-xs font-bold text-gray-400 w-4">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...memberInputs];
                            updated[idx].name = e.target.value;
                            setMemberInputs(updated);
                          }}
                          placeholder={`애칭/닉네임`}
                          className="flex-1 px-2.5 py-1.5 text-xs border rounded-lg outline-none"
                        />
                        <input
                          type="password"
                          maxLength={6}
                          value={item.pin}
                          onChange={(e) => {
                            const updated = [...memberInputs];
                            updated[idx].pin = e.target.value;
                            setMemberInputs(updated);
                          }}
                          placeholder="개인 PIN 4자리"
                          className="w-28 px-2.5 py-1.5 text-xs border rounded-lg outline-none tracking-widest text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToMeetingStep}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md"
                >
                  다음: 만나는 날짜 및 장소 입력 ➡️
                </button>
              </div>
            )}

            {/* STEP 2: 만나는 날 설정 */}
            {authStep === 'setup-meeting' && (
              <div className="space-y-4 text-center">
                <span className="text-3xl">🗓️</span>
                <h2 className="text-xl font-black">다음에 우리 언제 만날까?</h2>

                <div className="text-left space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      다음 만나는 날짜
                    </label>
                    <input
                      type="date"
                      value={meetingDateInput}
                      onChange={(e) => setMeetingDateInput(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border rounded-xl outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      다음 만나는 장소
                    </label>
                    <input
                      type="text"
                      value={meetingPlaceInput}
                      onChange={(e) => setMeetingPlaceInput(e.target.value)}
                      placeholder="예: 성수동 카페거리"
                      className="w-full px-4 py-2.5 text-sm border rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => setAuthStep('setup-basic')}
                    className="w-1/3 py-3 bg-gray-100 rounded-xl text-xs font-bold"
                  >
                    이전
                  </button>
                  <button
                    onClick={handleFinishSetup}
                    className="w-2/3 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    방 완성하고 시작하기 ✨
                  </button>
                </div>
              </div>
            )}

            {/* 로그인 단계 */}
            {authStep === 'login' && (
              <div className="space-y-4">
                <h2 className="text-lg font-black">기존 방 복원</h2>
                <input
                  type="text"
                  value={loginRoomName}
                  onChange={(e) => setLoginRoomName(e.target.value)}
                  placeholder="방 이름"
                  className="w-full px-4 py-2 text-sm border rounded-xl outline-none"
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="방 비밀번호"
                  className="w-full px-4 py-2 text-sm border rounded-xl outline-none"
                />
                {loginError && (
                  <p className="text-xs text-red-500">{loginError}</p>
                )}
                <button
                  onClick={handleLogin}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-bold"
                >
                  열기
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 헤더 바 (보안 적용 드롭다운) ================= */}
      {roomData && (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗝️</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-sm text-gray-900">
                    {roomData.roomName}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {roomData.mode === 'couple' ? '커플' : '친구'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 테마 변경 */}
              <select
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  persistRoomData({ ...roomData, theme: e.target.value });
                }}
                className="text-xs bg-gray-100 rounded-xl px-2 py-1.5 font-semibold outline-none"
              >
                <option value="theme-butter-blue">🧈 버터 & 블루</option>
                <option value="theme-pink-blue">🌸 핑크 & 베이비블루</option>
                <option value="theme-monochrome">🖤 모노크롬</option>
              </select>

              {/* 사용자 전환: 선택 시 즉시 변경되지 않고 개인 PIN 인증 모달 실행[cite: 1] */}
              <select
                value={currentUserId}
                onChange={(e) => handleRequestSwitchUser(e.target.value)}
                className="text-xs bg-blue-50 text-blue-700 font-black border border-blue-200 rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                {roomData.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.keyIcon} {m.name}{' '}
                    {m.id === currentUserId ? '(현재 접속)' : '🔒'}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setAuthStep('choice')}
                className="p-1.5 text-gray-400 hover:text-gray-700"
              >
                🚪
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ================= 대시보드 ================= */}
      {roomData && (
        <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
          {/* D-Day 카드 */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <span className="text-xs font-bold text-blue-600">D-Day</span>
                <h2 className="text-lg font-black">{dDayInfo.text}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {roomData.meetingPlace || '장소 미정'}
                </p>
              </div>
              <input
                type="date"
                value={roomData.meetingDate}
                onChange={(e) =>
                  persistRoomData({ ...roomData, meetingDate: e.target.value })
                }
                className="text-xs border rounded-xl p-2 bg-gray-50"
              />
            </div>
          </section>

          {/* 1일 1개 위시 작성 */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-gray-900">
                🤫 {currentUser?.name}의 시크릿 위시 (1일 1개)
              </h3>
              <span className="text-[11px] text-amber-600 font-bold">
                D-1 전까지 상대방 열람 불가 🔒
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newWishText}
                onChange={(e) => setNewWishText(e.target.value)}
                placeholder="다음에 만나서 하고 싶은 일"
                className="flex-1 text-xs px-4 py-3 rounded-2xl border bg-gray-50/50 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddWish()}
              />
              <button
                onClick={handleAddWish}
                className="bg-blue-600 text-white text-xs font-bold px-5 py-3 rounded-2xl"
              >
                기록
              </button>
            </div>
          </section>

          {/* 내 위시리스트 우선순위 정렬 */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-black text-sm text-gray-900 mb-3">
              📋 {currentUser?.name}님의 위시 우선순위
            </h3>
            <div className="space-y-2">
              {currentUser?.wishes.map((w, idx) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => setDraggedWishIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropWish(idx)}
                  className="flex justify-between items-center p-3 rounded-2xl border bg-white cursor-grab"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                      {idx + 1}위
                    </span>
                    <span className="text-xs font-bold">{w.text}</span>
                    <span className="text-[10px] text-gray-400">
                      ({w.createdDate.slice(5).replace('-', '/')})
                    </span>
                  </div>
                  <span className="text-xs text-gray-300">≡</span>
                </div>
              ))}
              {currentUser?.wishes.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400 border border-dashed rounded-2xl">
                  아직 등록한 위시가 없습니다.
                </div>
              )}
            </div>
          </section>

          {/* D-1 언박싱 스테이션 */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b">
              <div>
                <h3 className="font-black text-sm">🗝️ 키 전송 & 언박싱</h3>
                <p className="text-[11px] text-gray-400">
                  D-1 전까지는 상대의 키가 전달되지 않아 볼 수 없습니다.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg text-xs">
                <input
                  type="checkbox"
                  id="testD1"
                  checked={testD1Mode}
                  onChange={(e) => setTestD1Mode(e.target.checked)}
                />
                <label htmlFor="testD1" className="text-xs text-gray-600">
                  D-1 테스트 모드
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              {roomData.members.map((m) => {
                const isMe = m.id === currentUser?.id;
                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl border text-center bg-gray-50/50"
                  >
                    <div className="text-3xl">{m.keyIcon}</div>
                    <div className="font-bold text-xs mt-1">
                      {m.name} {isMe ? '(나)' : ''}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {m.keyShared ? '키 전송 완료 🔓' : '비밀 잠금 중 🔒'}
                    </div>
                    {isMe ? (
                      <button
                        disabled={!canUnlockNow}
                        onClick={handleToggleKey}
                        className={`w-full mt-3 py-1.5 rounded-xl text-xs font-bold ${
                          !canUnlockNow
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {!canUnlockNow
                          ? 'D-1부터 오픈 가능'
                          : m.keyShared
                          ? '키 회수'
                          : '내 키 전송하기'}
                      </button>
                    ) : (
                      <div className="mt-3 py-1.5 text-[10px] bg-white rounded-xl text-gray-400 border">
                        {m.keyShared ? '키 도달함 ✨' : '대기 중'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 언박싱 완료 시에만 노출되는 상대방 위시리스트 */}
          {roomData.unboxed && (
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-pink-200">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-sm text-pink-600">
                  ✨ 언박싱 성공! 서로의 위시 공개
                </h3>
                <div className="flex gap-1">
                  {roomData.members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setActiveTabUserId(m.id)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                        activeTabUserId === m.id
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {roomData.members
                  .find((m) => m.id === activeTabUserId)
                  ?.wishes.map((w, idx) => (
                    <div
                      key={w.id}
                      className="p-3 border rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-pink-600">
                          {idx + 1}위
                        </span>
                        <span className="text-xs font-semibold">{w.text}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {w.createdDate}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
