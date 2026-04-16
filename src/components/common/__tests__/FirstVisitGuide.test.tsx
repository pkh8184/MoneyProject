import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import FirstVisitGuide from '../FirstVisitGuide'

describe('FirstVisitGuide', () => {
  const steps = [
    { title: 'Step A', body: 'first content' },
    { title: 'Step B', body: 'second content' }
  ]

  it('renders first step initially', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    expect(screen.getByText('Step A')).toBeInTheDocument()
    expect(screen.getByText('first content')).toBeInTheDocument()
  })

  it('advances to next step on Next click', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('다음'))
    expect(screen.getByText('Step B')).toBeInTheDocument()
  })

  it('shows Start button + checkbox on last step', () => {
    render(<FirstVisitGuide steps={steps} onDismiss={() => {}} />)
    fireEvent.click(screen.getByText('다음'))
    expect(screen.getByText('시작')).toBeInTheDocument()
    expect(screen.getByLabelText('다시 보지 않기')).toBeInTheDocument()
  })

  it('calls onDismiss with persist=true when checkbox checked + Start clicked', () => {
    const onDismiss = vi.fn()
    render(<FirstVisitGuide steps={steps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('다음'))
    fireEvent.click(screen.getByLabelText('다시 보지 않기'))
    fireEvent.click(screen.getByText('시작'))
    expect(onDismiss).toHaveBeenCalledWith(true)
  })

  it('calls onDismiss with persist=false when Skip clicked', () => {
    const onDismiss = vi.fn()
    render(<FirstVisitGuide steps={steps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText('건너뛰기'))
    expect(onDismiss).toHaveBeenCalledWith(false)
  })
})
