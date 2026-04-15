import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import Card from '../Card'
import Button from '../Button'
import Pill from '../Pill'
import GaugeBar from '../GaugeBar'

describe('UI components', () => {
  it('Card renders with rounded-2xl and shadow', () => {
    const { container } = render(<Card>content</Card>)
    expect(container.firstChild).toHaveClass('rounded-2xl')
    expect(container.firstChild).toHaveClass('shadow-soft')
  })
  it('Button primary is rounded-full', () => {
    const { container } = render(<Button>ok</Button>)
    expect(container.firstChild).toHaveClass('rounded-full')
  })
  it('Pill is rounded-full', () => {
    const { container } = render(<Pill>x</Pill>)
    expect(container.firstChild).toHaveClass('rounded-full')
  })
  it('GaugeBar clamps value', () => {
    const { container } = render(<GaugeBar value={150} />)
    const divs = container.querySelectorAll('div')
    const inner = divs[divs.length - 1] as HTMLDivElement
    expect(inner.style.width).toBe('100%')
  })
})
