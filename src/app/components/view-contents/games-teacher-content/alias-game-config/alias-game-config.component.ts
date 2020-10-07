import { Component, OnInit } from '@angular/core';
import { GamesApiService } from '@app/services/custom/games/games-api.service';
import { Alias } from '@app/models/game-models/alias';

@Component({
  selector: 'app-alias-game-config',
  templateUrl: './alias-game-config.component.html',
  styleUrls: ['./alias-game-config.component.less']
})
export class AliasGameConfigComponent implements OnInit {
  games: Alias[];

  newGame: Alias = {
    id: 0,
    name: "",
    description: "",
    words: []
  }

  constructor(private api: GamesApiService) { }

  ngOnInit(): void {
    this.api.getAliasGames().subscribe(data => {
      this.games = data;
    });
  }

  onCreateGame(game: Alias) {
    this.api.createAliasGame(game).subscribe(data => {
      console.log("created game", data)
      // TODO handle true response
      this.games.push(game);
    });
  }

  onGameChange(game: Alias) {
    this.api.updateAliasGame(game).subscribe(data => {
      console.log("changed", data)
      this.games[this.games.findIndex(g => {
        return g.id === game.id
      })] = game;
    });
  }


  addWord(id: number, word: string) {
    this.games.find(game => game.id === id).words.push(word)
  }
}
