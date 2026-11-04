import React from 'react';
import { render, screen } from '@testing-library/react';
import { MatchHeadline } from './MatchScore';

const match = (score) => ({ score });
const teams = (a, b) => [{ name: 'Ravens', score: a }, { name: 'Bills', score: b }];

describe('MatchHeadline', () => {
  it('leads with each team and its score once there are points', () => {
    render(<MatchHeadline match={match({ status: 'live', teams: teams('24', '27') })} title="Baltimore Ravens vs. Buffalo Bills" />);
    const heading = screen.getByRole('heading', { name: 'Ravens 24, Bills 27' });
    expect(heading).toHaveTextContent('Ravens24Bills27');
  });

  it('keeps the title before kickoff or without a score', () => {
    const { rerender } = render(<MatchHeadline match={match({ status: 'pre', teams: teams('', '') })} title="Ravens vs. Bills" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Ravens vs. Bills');
    rerender(<MatchHeadline match={{}} title="Ravens vs. Bills" />);
    expect(screen.getByRole('heading')).toHaveTextContent('Ravens vs. Bills');
  });
});
