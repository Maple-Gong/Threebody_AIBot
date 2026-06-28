// ReAct步骤展示组件
export default function ReActSteps({ steps }) {
  if (!steps || steps.length === 0) return null

  return (
    <div className="react-steps">
      <div className="react-steps-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        ReAct 推理过程
      </div>
      {steps.map((step, i) => {
        let icon = '?'; let label = ''; let cls = ''
        if (step.type === 'thought') { icon = '💡'; label = '思考'; cls = 'react-thought' }
        else if (step.type === 'action') { icon = '🔧'; label = '工具调用'; cls = 'react-action' }
        else if (step.type === 'observation') { icon = '👁'; label = '观察结果'; cls = 'react-observation' }

        let content = step.content || ''
        if (step.type === 'action') {
          content = `工具: ${step.tool}`
          if (step.input) content += ` | 输入: ${step.input.slice(0, 60)}${step.input.length > 60 ? '...' : ''}`
        }
        if (step.type === 'observation') {
          content = `工具: ${step.tool} | ${step.found ? '✅ 找到结果' : '❌ 未找到'}`
          if (step.content) content += `\n${step.content.slice(0, 200)}${step.content.length > 200 ? '...' : ''}`
        }

        return (
          <div key={i} className={`react-step ${cls}`}>
            <div className="react-step-label">{icon} {label}</div>
            <div className="react-step-content">{content}</div>
          </div>
        )
      })}
    </div>
  )
}
