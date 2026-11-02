import React, { useState, useEffect } from 'react';
import { Check, Play, X } from 'lucide-react';
import useModalBehavior from '../useModalBehavior';
import { tmdbApi } from '../utils/tmdbApi';
import './MovieDetailsModal.css';

const TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p';

const MovieDetailsModal = ({ movieDetails, onClose, onPlayStream }) => {
  const [streamError, setStreamError] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState(null);
  const [isAdded, setIsAdded] = useState(false);
  const dialogRef = useModalBehavior(true, onClose);

  const isTV = movieDetails.type === 'tv';
  const heroPath = movieDetails.backdropPath || movieDetails.posterPath;
  const meta = [
    isTV ? 'TV series' : 'Movie',
    movieDetails.genre !== 'Unknown' && movieDetails.genre,
    movieDetails.year !== 'Unknown' && movieDetails.year,
    movieDetails.rating > 0 && `${movieDetails.rating.toFixed(1)} rating`
  ].filter(Boolean).join(', ');

  useEffect(() => {
    if (!isTV) return;

    let isCurrent = true;
    tmdbApi.getTVShowDetails(movieDetails.tmdb).then((show) => {
      if (!isCurrent) return;
      if (show) {
        setSeasons(show.seasons.filter(season => season.season_number > 0));
      } else {
        setError('Seasons could not be loaded. Close this and try again.');
      }
    });

    return () => { isCurrent = false; };
  }, [isTV, movieDetails.tmdb]);

  useEffect(() => {
    if (!isTV) return;

    let isCurrent = true;
    setLoadingEpisodes(true);
    tmdbApi.getSeasonDetails(movieDetails.tmdb, selectedSeason).then((season) => {
      if (!isCurrent) return;
      if (season) {
        setEpisodes(season.episodes);
        setSelectedEpisode(season.episodes[0]?.episode_number || 1);
      } else {
        setError('Episodes could not be loaded. Close this and try again.');
      }
      setLoadingEpisodes(false);
    });

    return () => { isCurrent = false; };
  }, [isTV, movieDetails.tmdb, selectedSeason]);

  const handleWatchNow = async () => {
    setStreamError(null);

    let streamUrlToPlay;
    let streamDetailsToPass;

    if (isTV) {
      const season = selectedSeason || 1;
      const episode = selectedEpisode || 1;
      streamUrlToPlay = `https://vidsrc.sh/embed/tv/${movieDetails.tmdb}/${season}-${episode}`;
      streamDetailsToPass = {
        ...movieDetails,
        title: `${movieDetails.title} S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`
      };
    } else {
      streamUrlToPlay = `https://vidsrc.sh/embed/movie/${movieDetails.tmdb}`;
      streamDetailsToPass = movieDetails;
    }

    setIsAdded(true);

    // onPlayStream is App.js's handleStreamSelect, which is async and returns a boolean
    const success = await onPlayStream(streamUrlToPlay, streamDetailsToPass);
    if (success) {
      setTimeout(onClose, 800);
    } else {
      setIsAdded(false);
      setStreamError('This title is not available right now. Try another one.');
    }
  };

  const watchLabel = isTV && selectedEpisode
    ? `Watch S${selectedSeason} E${selectedEpisode}`
    : 'Watch now';

  return (
    <div className="title-modal-backdrop" onClick={onClose}>
      <div
        className="title-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={movieDetails.title}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
      >
        <button className="icon-btn title-modal__close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={1.75} />
        </button>

        {heroPath && (
          <img
            className="title-modal__hero"
            src={`${TMDB_IMAGE_URL}/w1280${heroPath}`}
            alt=""
          />
        )}

        <div className="title-modal__body">
          <h2>{movieDetails.title}</h2>
          <p className="title-modal__meta">{meta}</p>

          <button className="btn btn--lg btn--primary title-modal__watch" onClick={handleWatchNow} disabled={isAdded}>
            {isAdded ? <Check size={18} /> : <Play size={18} fill="currentColor" />}
            {isAdded ? 'Added' : watchLabel}
          </button>

          {streamError && <p className="title-modal__error">{streamError}</p>}

          <p className="title-modal__overview">{movieDetails.overview}</p>

          {isTV && (
            <section className="title-modal__episodes">
              <div className="title-modal__episodes-header">
                <h3>Episodes</h3>
                {seasons.length > 0 && (
                  <select
                    aria-label="Season"
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  >
                    {seasons.map(season => (
                      <option key={season.season_number} value={season.season_number}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && <p className="title-modal__error">{error}</p>}
              {!error && loadingEpisodes && <p className="title-modal__status">Loading episodes...</p>}

              {!error && !loadingEpisodes && (
                <ol className="title-modal__episode-list">
                  {episodes.map(episode => (
                    <li key={episode.episode_number}>
                      <button
                        className="title-modal__episode"
                        aria-pressed={selectedEpisode === episode.episode_number}
                        onClick={() => setSelectedEpisode(episode.episode_number)}
                        onDoubleClick={handleWatchNow}
                      >
                        <span className="title-modal__still">
                          {episode.still_path && (
                            <img src={`${TMDB_IMAGE_URL}/w300${episode.still_path}`} alt="" loading="lazy" />
                          )}
                        </span>
                        <span className="title-modal__episode-text">
                          <strong>{episode.episode_number}. {episode.name}</strong>
                          {episode.runtime > 0 && <small>{episode.runtime} min</small>}
                          <span>{episode.overview}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsModal;
