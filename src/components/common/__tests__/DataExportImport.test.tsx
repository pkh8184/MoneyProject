import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import DataExportImport from '../DataExportImport'

describe('DataExportImport', () => {
  beforeEach(() => {
    localStorage.clear()
    if (!URL.createObjectURL) {
      URL.createObjectURL = () => 'blob:mock'
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = () => {}
    }
  })

  it('renders both buttons', () => {
    render(<DataExportImport />)
    expect(screen.getByText('내보내기 (JSON)')).toBeInTheDocument()
    expect(screen.getByText('가져오기 (JSON)')).toBeInTheDocument()
  })

  it('export does not throw when localStorage empty', () => {
    render(<DataExportImport />)
    expect(() => fireEvent.click(screen.getByText('내보내기 (JSON)'))).not.toThrow()
  })
})
