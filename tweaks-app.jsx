// Tweaks — 시퀀스 템포를 사용자가 직접 감으로 조절
function SnfmTweaksApp() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--tscale', String(1 / (t.speed || 1)));
    r.setProperty('--ttypo', String(t.typoHold || 1));
  }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="시퀀스 템포" />
      <TweakSlider label="전체 배속" value={t.speed} min={0.5} max={2} step={0.05} unit="×"
                   onChange={(v) => setTweak('speed', v)} />
      <TweakSlider label="타이포 머무는 시간" value={t.typoHold} min={0.6} max={2.2} step={0.05} unit="×"
                   onChange={(v) => setTweak('typoHold', v)} />
      <TweakButton label="인트로 다시 재생" onClick={() => location.reload()} />
    </TweaksPanel>
  );
}
ReactDOM.createRoot(document.getElementById('tweaksMount')).render(<SnfmTweaksApp />);
