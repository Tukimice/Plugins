1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
97
98
99
100
101
102
103
104
105
106
107
108
109
110
111
112
113
114
115
116
117
118
119
120
121
122
123
124
125
126
127
128
129
130
131
132
133
134
135
136
137
138
139
140
141
142
143
144
145
146
147
148
149
150
151
152
153
154
155
156
157
158
159
160
161
162
163
164
165
166
167
168
169
170
171
172
173
174
175
176
177
178
179
180
181
182
183
184
185
186
187
188
189
190
191
192
193
194
195
196
197
198
199
200
201
202
203
204
205
206
207
208
209
210
211
212
213
214
215
216
217
218
219
220
221
222
223
224
225
226
227
228
229
230
231
232
233
234
235
236
237
238
239
240
241
242
243
244
245
246
247
248
249
250
251
252
253
254
255
256
257
258
259
260
261
262
263
264
265
266
267
268
269
270
271
272
273
274
275
276
277
278
279
280
281
282
283
284
285
286
287
288
289
290
291
292
293
294
295
296
297
298
299
300
301
302
303
304
305
306
307
308
309
310
311
312
313
314
315
316
317
318
319
320
321
322
323
324
325
326
327
328
329
330
331
332
333
334
335
336
337
338
339
340
341
342
343
344
345
346
347
348
349
350
351
352
353
354
355
356
357
358
359
360
361
362
363
364
365
366
367
368
369
370
371
372
373
374
375
376
377
378
379
380
381
382
383
384
385
386
387
388
389
390
391
392
393
394
395
396
397
398
399
400
401
402
403
404
405
406
407
408
409
410
411
412
413
414
415
416
417
418
419
420
421
422
423
424
425
426
427
428
429
430
431
432
433
434
435
436
437
438
439
440
441
442
443
444
445
446
447
448
449
450
451
452
453
454
455
456
457
458
459
460
461
462
463
464
465
466
467
468
469
470
471
472
473
474
475
476
477
478
479
480
481
482
483
484
485
486
487
488
489
490
491
492
493
494
495
496
497
498
499
500
501
502
503
504
505
506
507
508
509
510
511
512
513
514
515
516
517
518
519
520
521
522
523
524
525
526
527
528
529
530
531
532
533
534
535
536
537
538
539
540
541
542
543
544
545
546
547
548
549
550
551
552
553
554
555
556
557
558
559
560
561
562
563
564
565
566
567
568
569
570
571
572
573
574
575
576
577
578
579
580
581
582
583
584
585
586
587
588
589
590
591
592
593
594
595
596
597
598
599
600
601
602
603
604
605
606
607
608
609
610
611
612
613
614
615
616
617
618
619
620
621
622
623
624
625
626
627
628
629
630
631
632
633
634
635
636
637
638
639
640
641
642
643
644
645
646
647
648
649
650
651
652
653
654
655
656
657
658
659
660
661
662
663
664
665
666
667
668
669
670
671
672
673
674
675
676
677
678
679
680
681
682
683
684
685
686
687
688
689
690
691
692
693
694
695
696
697
698
699
700
701
702
703
704
705
706
707
708
709
710
711
712
713
714
715
716
717
718
719
720
721
722
723
724
725
726
727
728
729
730
731
732
733
734
735
736
737
738
739
740
741
742
743
744
745
746
747
748
749
750
751
752
753
754
755
756
757
758
759
760
761
762
763
764
765
766
767
768
769
770
771
772
773
774
775
776
777
778
779
780
781
782
783
784
785
786
787
788
789
790
791
792
793
794
795
796
797
798
799
800
801
802
803
804
805
806
807
808
809
810
811
812
813
814
815
816
817
818
819
820
821
822
823
824
825
826
827
828
829
830
831
832
833
834
835
836
837
838
839
840
841
842
843
844
845
846
847
848
849
850
851
852
853
854
855
856
857
858
859
860
861
862
863
864
865
866
867
868
869
870
871
872
873
874
875
876
877
878
879
880
881
882
883
884
885
886
887
888
889
890
891
892
893
894
895
896
897
898
899
900
901
902
903
904
905
906
907
908
909
910
911
912
913
914
915
916
917
918
919
920
921
922
923
924
925
926
927
928
929
930
931
932
933
934
935
936
937
938
939
940
941
942
943
944
945
946
947
948
949
950
951
952
953
954
955
956
957
958
959
960
961
962
963
964
965
966
967
968
969
970
971
972
973
974
975
976
977
978
979
980
981
982
983
984
985
986
987
988
989
990
991
992
993
994
995
996
997
998
999
1000
1001
1002
1003
1004
1005
1006
1007
1008
1009
1010
1011
1012
1013
1014
1015
1016
//=============================================================================
// Yanfly Engine Plugins - Template
// YEP_GabWindow.js
//=============================================================================
 
var Imported = Imported || {};
Imported.YEP_GabWindow = true;
 
var Yanfly = Yanfly || {};
Yanfly.Gab = Yanfly.Gab || {};
 
//=============================================================================
 /*:
 * @plugindesc v1.05a The Gab Window functions as a window for random
 * jibber jabber that does not require a message window.
 * @author Yanfly Engine Plugins
 *
 * @param ---General---
 * @default
 *
 * @param Gab Font Name
 * @desc The font name used for the text of the Gab Window.
 * Default: GameFont
 * @default GameFont
 *
 * @param Gab Font Size
 * @desc The font size used for the text of the Gab Window.
 * Default: 28
 * @default 28
 *
 * @param Character X Pos
 * @desc X position of the character.
 * Default: 36
 * @default 36
 *
 * @param Character Y Pos
 * @desc Y position of the character.
 * Default: 60
 * @default 60
 * 
 * @param Base Wait Time
 * @desc Minimum frames the Gab Window stays visible.
 * Default: 90
 * @default 90
 *     
 * @param Time Per Character
 * @desc Frames added per Text Character.
 * Default: 4
 * @default 4
 *
 * @param Fade Rate
 * @desc Is is how fast the gab window fades away.
 * Default: 16
 * @default 16
 *
 * @param Anti-Repeat
 * @desc Stops gabs of the same settings from being queued.
 * NO - false     YES - true
 * @default true
 *
 * @param Map Y Location
 * @desc This is the Y location of the Gab Window.
 * Default: 72
 * @default 72
 * 
 * @param ---Base-Color0---
 * @default
 *
 * @param Map Dim Color 1
 * @desc This is the dim color 1 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param Map Dim Color 2
 * @desc This is the dim color 2 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param ---Base-Color1---
 * @default
 *
 * @param Map Dim Color 3
 * @desc This is the dim color 3 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param Map Dim Color 4
 * @desc This is the dim color 4 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param ---Base-Color2---
 * @default
 *
 * @param Map Dim Color 5
 * @desc This is the dim color 5 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param Map Dim Color 6
 * @desc This is the dim color 6 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param ---Base-Color3---
 * @default
 *  
 * @param Map Dim Color 7
 * @desc This is the dim color 7 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param Map Dim Color 8
 * @desc This is the dim color 8 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param ---Base-Color4---
 * @default
 * 
 * @param Map Dim Color 9
 * @desc This is the dim color 9 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *
 * @param Map Dim Color 10
 * @desc This is the dim color 10 used for maps.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.3)
 *   
 * @param ---Base-Color---
 * @default
 *
 * @param Base-Color
 * @desc Choose the number of Base-Color that you will use.
 * Default: 0   Random : 5
 * @default 0
 *
 * @param ---Battle---
 * @default
 *
 * @param Battle Y Location
 * @desc This is the Y location of the Gab Window.
 * Default: 108
 * @default 108
 *
 * @param Battle Dim Color 1
 * @desc This is the dim color 1 used for battles.
 * Default: rgba(0, 0, 0, 0.6)
 * @default rgba(0, 0, 0, 0.6)
 *
 * @param Battle Dim Color 2
 * @desc This is the dim color 2 used for battles.
 * Default: rgba(0, 0, 0, 0)
 * @default rgba(0, 0, 0, 0)
 *
 *         
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 *
 * Sometimes there's random jibber jabber that does not warrant a message box.
 * The Gab Window fulfills that jibber jabber by placing such text outside of
 * the message window box and at the corner of the screen. The gab text will
 * appear briefly and then disappear, not showing up again until the gab text
 * is updated with something else.
 *
 * New to the MV version is the ability to play sounds for your Gab Window in
 * addition to queueing multiple gabs together to have them form a conversation
 * of sorts. When queued up, the currently playing gab will continue showing
 * until it fades out before loading up the next gab.
 *
 * ============================================================================
 * Instructions
 * ============================================================================
 *
 * Using the Gab Window is quite simple. By default, it can be used in either
 * the map scene or the battle scene. To call upon it, you will to use a few
 * Plugin Commands to set up what you wish for the Gab Window to display.
 *
 * Plugin Commands:
 *
 * --- Custom Commands --- 
 *
 * --- Base Color ---  
 *
 * GabBaseColorx 
 * This sets the value of the color base
 * Example: GabBaseColor0 
 *
 * GabRandomColor
 * If you wanted to set various colors
 *
 * --- Setup Commands ---
 *
 * GabText text
 * This will set the gab window to type out the above text. Text codes can be
 * used for the Gab Window.
 * 
 * GabFaceName filename
 * If you wish to display a face graphic, use this plugin command to have it
 * display a face from the filename.
 *
 * GabFaceIndex x
 * Used in combination with the above plugin command to define which index the
 * face will use.
 *
 * GabSpriteName filename
 * If you wish to display a particular character sprite, use this plugin
 * command to have it display a sprite from the filename.
 *
 * GabSpriteIndex x
 * Used in combination with the above plugin command to define which index the
 * sprite will use.
 *
 * GabActor x
 * GabActorFace x
 * This will display actor x's face graphic where x is the actor's ID.
 *
 * GabActorSprite x
 * This will display actor x's sprite graphic where x is the actor's ID.
 *
 * GabParty x
 * GabPartyFace x
 * This will display party member x's face graphic where x is the position.
 *
 * GabPartySprite x
 * This will display party member x's sprite graphic where x is the position.
 *
 * GabSound filename
 * This will play a sound from the SE folder under that particular filename.
 *
 * GabSwitch x
 * This will enable switch x when this gab finishes playing.
 *
 * --- Display Commands ---
 *
 * ShowGab
 * Once the above settings are complete, use this Plugin Command to launch the
 * Gab Window and display the above data. This will put the gab data into a
 * queue which means if there's another gab playing, this will be next in line.
 *
 * *Note If multiple ShowGabs are used, they will be queued up. The current
 * playing gab will finish playing before moving onto the next. If it so
 * happens that the inputted Gab would have the same exact settings as a
 * previously loaded gab within the same queue, it will not be inserted to
 * prevent any redundancy amongst the conversation.
 *
 * ForceGab
 * Once the above settings are complete, use this Plugin Command to clear all
 * the other gabs in the Gab Window and display the above data.
 *
 * ClearGab
 * This clears out the Gab Window of the current gab and any gabs queued.
 *
 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * 
 * Version 1.05a:
 * - Add new function color base
 * - Removed Function base position
 * - Removed Function base time 
 * - Add new commands of plugin
 *
 * Version 1.05:
 * - Add new color base
 * - Add new position base
 * - Add new time base
 *
 * Version 1.04:
 * - Fixed an issue with ForceGab that didn't make it work properly with text
 * coded Gabs.
 *
 * Version 1.03a:
 * - Fixed a bug with GabSound that didn't load the proper sound filenames.
 * - Fixed the time count for Gabs to not include text codes.
 *
 * Version 1.02a:
 * - Added functionality for battle gabs to be saved when going into other
 * scenes and returning to battle.
 * - Added GabSwitch x to enable switch x when the gab finishes playing.
 *
 * Version 1.01:
 * - Added 'GabParty x' and 'GabPartySprite x' plugin commands to help with
 * those without dynamic party setups.
 *
 * Version 1.00:
 * - Finished Plugin!
 *
 */
//=============================================================================
 
//=============================================================================
// Parameter Variables
//=============================================================================
 
Yanfly.Parameters = PluginManager.parameters('YEP_GabWindow');
Yanfly.Param = Yanfly.Param || {};
 
Yanfly.Param.GabFontName = String(Yanfly.Parameters['Gab Font Name']);
Yanfly.Param.GabFontSize = Number(Yanfly.Parameters['Gab Font Size']);
Yanfly.Param.GabCharPosX = Number(Yanfly.Parameters['Character X Pos']);
Yanfly.Param.GabCharPosY = Number(Yanfly.Parameters['Character Y Pos']);
Yanfly.Param.GabBaseTime = Number(Yanfly.Parameters['Base Wait Time']);
Yanfly.Param.GabTimePerChar = Number(Yanfly.Parameters['Time Per Character']);
Yanfly.Param.GabFadeRate = Number(Yanfly.Parameters['Fade Rate']);
Yanfly.Param.GabAntiRepeat = Boolean(Yanfly.Parameters['Anti-Repeat']);
 
Yanfly.Param.GabMapYLoc = Number(Yanfly.Parameters['Map Y Location']);
Yanfly.Param.GabMapDim1 = String(Yanfly.Parameters['Map Dim Color 1']);
Yanfly.Param.GabMapDim2 = String(Yanfly.Parameters['Map Dim Color 2']);
 
Yanfly.Param.GabBattleYLoc = Number(Yanfly.Parameters['Battle Y Location']);
Yanfly.Param.GabBattleDim1 = String(Yanfly.Parameters['Battle Dim Color 1']);
Yanfly.Param.GabBattleDim2 = String(Yanfly.Parameters['Battle Dim Color 2']);
 
 
//=============================================================================
// Base-Color
//=============================================================================
 
//=============================================================================
// Parameter Variables Base-Color
//=============================================================================
 
Yanfly.Param.GabMapDim3 = String(Yanfly.Parameters['Map Dim Color 3']);
Yanfly.Param.GabMapDim4 = String(Yanfly.Parameters['Map Dim Color 4']);
Yanfly.Param.GabMapDim5 = String(Yanfly.Parameters['Map Dim Color 5']);
Yanfly.Param.GabMapDim6 = String(Yanfly.Parameters['Map Dim Color 6']);
Yanfly.Param.GabMapDim7 = String(Yanfly.Parameters['Map Dim Color 7']);
Yanfly.Param.GabMapDim8 = String(Yanfly.Parameters['Map Dim Color 8']);
Yanfly.Param.GabMapDim9 = String(Yanfly.Parameters['Map Dim Color 9']);
Yanfly.Param.GabMapDim10 = String(Yanfly.Parameters['Map Dim Color 10']);
Yanfly.Param.GabBaseColor = Number(Yanfly.Parameters['Base-Color']);
 
//=============================================================================
// Default Base-Color 
//=============================================================================
 
//Base - Random
if (Yanfly.Param.GabBaseColor > 4) {
    Yanfly.Param.GabBaseColor = Math.floor(Math.random() * 5);  
}; 
 
//Base - 0
if (Yanfly.Param.GabBaseColor == 0) {
Yanfly.Param.GabMapDim1;
Yanfly.Param.GabMapDim2;
};
 
//Base - 1
if (Yanfly.Param.GabBaseColor == 1) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim3;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim4;
};
 
//Base - 2
if (Yanfly.Param.GabBaseColor == 2) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim5;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim6;
};
 
//Base - 3
if (Yanfly.Param.GabBaseColor == 3) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim7;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim8;
}; 
 
//Base - 4
if (Yanfly.Param.GabBaseColor == 4) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim9;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim10;
};    
 
//=============================================================================
// Game_Interpreter
//=============================================================================
 
Yanfly.Gab.Game_Interpreter_clear = Game_Interpreter.prototype.clear;
Game_Interpreter.prototype.clear = function() {
    Yanfly.Gab.Game_Interpreter_clear.call(this);
    this.clearGabInformation();
};
 
Yanfly.Gab.Game_Interpreter_pluginCommand =
    Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    Yanfly.Gab.Game_Interpreter_pluginCommand.call(this, command, args)
    if (command === 'GabText') this.setGabText(args);
    if (command === 'GabSpriteName') this.setGabSpriteName(args);
    if (command === 'GabSpriteIndex') this.setGabSpriteIndex(args);
    if (command === 'GabFaceName') this.setGabFaceName(args);
    if (command === 'GabFaceIndex') this.setGabFaceIndex(args);
    if (command === 'GabActorSprite') this.setGabActorSprite(args);
    if (command === 'GabActor') this.setGabActorFace(args);
    if (command === 'GabActorFace') this.setGabActorFace(args);
    if (command === 'GabPartySprite') this.setGabPartySprite(args);
    if (command === 'GabParty') this.setGabPartyFace(args);
    if (command === 'GabPartyFace') this.setGabPartyFace(args);
    if (command === 'GabSound') this.setGabSound(args);
    if (command === 'GabSwitch') this.setGabSwitch(args);
    if (command === 'ShowGab') this.showGab();
    if (command === 'ForceGab') this.forceGab();
    if (command === 'ClearGab') this.clearGab();
    if (command === 'GabBaseColor0') this.setBaseColor0(args);
    if (command === 'GabBaseColor1') this.setBaseColor1(args);
    if (command === 'GabBaseColor2') this.setBaseColor2(args);
    if (command === 'GabBaseColor3') this.setBaseColor3(args);
    if (command === 'GabBaseColor4') this.setBaseColor4(args);
    if (command === 'GabRandomColor') this.setRandomColor(args);  
};
 
//=============================================================================
// Function Base-Select-Color
//=============================================================================
 
Game_Interpreter.prototype.setRandomColor = function(args) {
 
//Base - Random 
Yanfly.Param.GabBaseColor = Math.floor(Math.random() * 5);  
 
//Base - 0
if (Yanfly.Param.GabBaseColor == 0) {
Yanfly.Param.GabMapDim1;
Yanfly.Param.GabMapDim2;
};
 
//Base - 1
if (Yanfly.Param.GabBaseColor == 1) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim3;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim4;
};
 
//Base - 2
if (Yanfly.Param.GabBaseColor == 2) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim5;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim6;
};
 
//Base - 3
if (Yanfly.Param.GabBaseColor == 3) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim7;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim8;
}; 
 
//Base - 4
if (Yanfly.Param.GabBaseColor == 4) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim9;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim10;
};  
 
};
 
//Set Color 0
Game_Interpreter.prototype.setBaseColor0 = function(args) {
Yanfly.Param.GabMapDim1;
Yanfly.Param.GabMapDim2;
};
 
//Set Color 1
Game_Interpreter.prototype.setBaseColor1 = function(args) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim3;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim4;  
};
 
//Set Color 2
Game_Interpreter.prototype.setBaseColor2 = function(args) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim5;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim6;
};
 
//Set Color 3
Game_Interpreter.prototype.setBaseColor3 = function(args) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim7;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim8;
};
 
//Set Color 4
Game_Interpreter.prototype.setBaseColor4 = function(args) {
Yanfly.Param.GabMapDim1 = Yanfly.Param.GabMapDim9;
Yanfly.Param.GabMapDim2 = Yanfly.Param.GabMapDim10;
};
 
//=============================================================================
// End of custom functions
//=============================================================================
 
Game_Interpreter.prototype.clearGabInformation = function() {
    this._gabText = '';
    this._gabGraphicType = 'none';
    this._gabGraphicName = '';
    this._gabGraphicIndex = 0;
    this._gabSoundName = '';
    this._gabSwitch = 0;
};
 
Game_Interpreter.prototype.setGabText = function(args) {
    var text = '';
    for (var i = 0; i < args.length; ++i) {
      text = text + args[i] + ' ';
    }
    this._gabText = text;
};
 
Game_Interpreter.prototype.setGabSpriteName = function(args) {
    this._gabGraphicType = 'character';
    var text = '';
    if (args.length === 1) return this._gabGraphicName = String(args[0]);
    for (var i = 0; i < args.length; ++i) {
      text = text + ' ' + args[i];
    }
    this._gabGraphicName = text;
};
 
Game_Interpreter.prototype.setGabSpriteIndex = function(args) {
    this._gabGraphicType = 'character';
    this._gabGraphicIndex = parseInt(args[0]);
};
 
Game_Interpreter.prototype.setGabFaceName = function(args) {
    this._gabGraphicType = 'face';
    var text = '';
    if (args.length === 1) return this._gabGraphicName = String(args[0]);
    for (var i = 0; i < args.length; ++i) {
      text = text + ' ' + args[i];
    }
    this._gabGraphicName = text;
};
 
Game_Interpreter.prototype.setGabFaceIndex = function(args) {
    this._gabGraphicType = 'face';
    this._gabGraphicIndex = parseInt(args[0]);
};
 
Game_Interpreter.prototype.setGabActorSprite = function(args) {
    var actorId = parseInt(args[0]);
    var actor = $gameActors.actor(actorId);
    if (!actor) return;
    this._gabGraphicType = 'character';
    this._gabGraphicName = actor.characterName();
    this._gabGraphicIndex = actor.characterIndex();
};
 
Game_Interpreter.prototype.setGabPartySprite = function(args) {
    var position = parseInt(args[0]);
    if (position <= 0) return;
    position -= 1;
    var actor = $gameParty.members()[position];
    if (!actor) return;
    var actorId = actor._actorId;
    this.setGabActorSprite([actorId]);
};
 
Game_Interpreter.prototype.setGabActorFace = function(args) {
    var actorId = parseInt(args[0]);
    var actor = $gameActors.actor(actorId);
    if (!actor) return;
    this._gabGraphicType = 'face';
    this._gabGraphicName = actor.faceName();
    this._gabGraphicIndex = actor.faceIndex();
};
 
Game_Interpreter.prototype.setGabPartyFace = function(args) {
    var position = parseInt(args[0]);
    if (position <= 0) return;
    position -= 1;
    var actor = $gameParty.members()[position];
    if (!actor) return;
    var actorId = actor._actorId;
    this.setGabActorFace([actorId]);
};
 
Game_Interpreter.prototype.setGabSound = function(args) {
    var text = '';
    if (args.length === 1) return this._gabSoundName = String(args[0]);
    for (var i = 0; i < args.length; ++i) {
      if (i === 0) {
        text = args[0];
        continue;
      }
      text = text + ' ' + args[i];
    }
    this._gabSoundName = text;
};
 
Game_Interpreter.prototype.setGabSwitch = function(args) {
    this._gabSwitch = parseInt(args[0]);
};
 
Game_Interpreter.prototype.showGab = function() {
    if (!this._gabText) return;
    var gabData = [
        this._gabText,
        this._gabGraphicType,
        this._gabGraphicName,
        this._gabGraphicIndex,
        this._gabSoundName,
        this._gabSwitch
    ];
    var scene = SceneManager._scene;
    if (scene._gabWindow) scene.startGabWindow(gabData);
    this.clearGabInformation();
};
 
Game_Interpreter.prototype.forceGab = function() {
    if (!this._gabText) return;
    var gabData = [
        this._gabText,
        this._gabGraphicType,
        this._gabGraphicName,
        this._gabGraphicIndex,
        this._gabSoundName,
        this._gabSwitch
    ];
    var scene = SceneManager._scene;
    if (scene._gabWindow) scene.forceGabWindow(gabData);
    this.clearGabInformation();
};
 
Game_Interpreter.prototype.clearGab = function() {
    var scene = SceneManager._scene;
    if (scene._gabWindow) scene.clearGabWindow();
    this.clearGabInformation();
};
 
//=============================================================================
// Window_Gab
//=============================================================================
 
function Window_Gab() {
    this.initialize.apply(this, arguments);
}
 
Window_Gab.prototype = Object.create(Window_Base.prototype);
Window_Gab.prototype.constructor = Window_Gab;
 
Window_Gab.prototype.initialize = function(battle) {
    this._battle = battle;
    var wx = this.standardPadding() * -1;
    if (battle) {
      var wy = Yanfly.Param.GabBattleYLoc - this.standardPadding();
    } else {
      var wy = Yanfly.Param.GabMapYLoc - this.standardPadding();                    
    }
    var ww = Graphics.boxWidth + this.standardPadding() * 2;
    var wh = this.fittingHeight(2);
    this._gabSwitch = 0;
    this._showCount = 0;
    this._ignoreMask = true;
    this._gabQueue = [];
    this._currentGab = [];
    this._gabSwitchedOn = false;
    Window_Base.prototype.initialize.call(this, wx, wy, ww, wh);
    this.restoreGabs();
    this.clear();
};
 
Window_Gab.prototype.clear = function() {
    this._gabLoaded = false;
    this._graphicLoading = false;
    this.opacity = 0;
    this.contentsOpacity = 0;
    this._text = '';
    this._graphicType = 'none';
    this._graphicName = '';
    this._graphicIndex = 0;
    this._soundName = '';
    this._graphicBitmap = undefined;
};
 
Window_Gab.prototype.standardFontFace = function() {
    return Yanfly.Param.GabFontName;
};
 
Window_Gab.prototype.standardFontSize = function() {
    return Yanfly.Param.GabFontSize;
};
 
Window_Gab.prototype.update = function() {
    Window_Base.prototype.update.call(this);
    if (this.isHideGabWindow()) {
      this.hide();
    } else if (this._gabLoaded) {
      if (this._graphicLoading && this._graphicBitmap.width <= 0) return;
      this.refresh();
    } else if (this._showCount > 0) {
      this.updateFadeIn();
      --this._showCount;
    } else if (this.contentsOpacity > 0) {
      this.updateFadeOut();
    } else if (this._gabQueue.length > 0) {
      this.processNewGabData()
    }
};
 
Window_Gab.prototype.isHideGabWindow = function() {
    if ($gameParty.inBattle() && BattleManager._victoryPhase) return true;
    return false;
};
 
Window_Gab.prototype.updateFadeIn = function() {
    this.contentsOpacity += Yanfly.Param.GabFadeRate;
};
 
Window_Gab.prototype.updateFadeOut = function() {
    this.contentsOpacity -= Yanfly.Param.GabFadeRate;
    if (this.contentsOpacity > 0) return;
    if (this._gabSwitchedOn) return;
    if (this._gabSwitch) {
      $gameSwitches.setValue(this._gabSwitch, true);
      this._gabSwitchedOn = true;
 
    }
};
 
Window_Gab.prototype.addGabData = function(gabData) {
    if (!gabData) return;
    if (this.checkDuplicateGab(gabData)) return;
    this._gabQueue.push(gabData);
};
 
Window_Gab.prototype.forceGabData = function(gabData) {
    if (!gabData) return;
    this.clearGabData();
    this._gabQueue.push(gabData);
};
 
Window_Gab.prototype.clearGabData = function() {
    this._gabQueue = [];
    this._currentGab = [];
    this._showCount = 0;
};
 
Window_Gab.prototype.checkDuplicateGab = function(gabData) {
    if (!Yanfly.Param.GabAntiRepeat) return false;
    if (this.checkCurrentGab(gabData)) return true;
    if (this.checkQueuedGabs(gabData)) return true;
    return false;
};
 
Window_Gab.prototype.checkCurrentGab = function(gabData) {
    var iteration = this._currentGab;
    if (iteration[0] !== gabData[0]) return false;
    if (iteration[1] !== gabData[1]) return false;
    if (iteration[2] !== gabData[2]) return false;
    if (iteration[3] !== gabData[3]) return false;
    if (iteration[4] !== gabData[4]) return false;
    if (iteration[5] !== gabData[5]) return false;
    return true;
};
 
Window_Gab.prototype.checkQueuedGabs = function(gabData) {
    for (var i = 0; i < this._gabQueue.length; ++i) {
      var iteration = this._gabQueue[i];
      if (iteration[0] !== gabData[0]) continue;
      if (iteration[1] !== gabData[1]) continue;
      if (iteration[2] !== gabData[2]) continue;
      if (iteration[3] !== gabData[3]) continue;
      if (iteration[4] !== gabData[4]) continue;
      if (iteration[5] !== gabData[5]) continue;
      return true;
    }
    return false;
};
 
Window_Gab.prototype.processNewGabData = function() {
    var gabData = this._gabQueue.shift();
    this._gabSwitchedOn = false;
    this._currentGab = gabData;
    this._text = gabData[0] || '';
    this._graphicType = gabData[1] || 'none';
    this._graphicName = gabData[2] || '';
    this._graphicIndex = gabData[3] || 0;
    this._soundName = gabData[4] || 0;
    this._gabSwitch = gabData[5] || 0;
    this.setupLoadGraphic();
    this._gabLoaded = true;
};
 
Window_Gab.prototype.setupLoadGraphic = function() {
    this._graphicLoading = false;
    if (this._graphicType === 'character') {
      this._graphicBitmap = ImageManager.loadCharacter(this._graphicName);
      this._graphicLoading = true;
    } else if (this._graphicType === 'face') {
      this._graphicBitmap = ImageManager.loadFace(this._graphicName);
      this._graphicLoading = true;
    }
};
 
Window_Gab.prototype.refresh = function() {
    this.contents.clear();
    this.startCountdown();
    this.drawGabBackground();
    this.drawGabCharacter();
    this.drawGabText();
    this.playSound();
    this.clear();
};
 
Yanfly.Gab.WindowLayer_webglMaskWindow =
    WindowLayer.prototype._webglMaskWindow;
WindowLayer.prototype._webglMaskWindow = function(renderSession, win) {
    if (win._ignoreMask) return;
    Yanfly.Gab.WindowLayer_webglMaskWindow.call(this, renderSession, win);
};
 
Window_Gab.prototype.startCountdown = function() {
    this._graphicLoading = false;
    this.contentsOpacity = 255;
    this._showCount = Yanfly.Param.GabBaseTime;
    var text = this._text.replace(/\\(.*?)\[(.*?)\]/gi, '');
    this._showCount += text.length * Yanfly.Param.GabTimePerChar;
};
 
Window_Gab.prototype.drawGabBackground = function() {
    var width = this.contentsWidth();
    this.drawBackground(0, 0, width, this.lineHeight() * 2);
};
 
Window_Gab.prototype.dimColor1 = function() {
    if ($gameParty.inBattle()) {
      return Yanfly.Param.GabBattleDim1;
    } else {
      return Yanfly.Param.GabMapDim1;
    }
};
 
Window_Gab.prototype.dimColor2 = function() {
    if ($gameParty.inBattle()) {
      return Yanfly.Param.GabBattleDim2;
    } else {
      return Yanfly.Param.GabMapDim2;
    }
};
 
Window_Gab.prototype.drawBackground = function(wx, wy, ww, wh) {
    var color1 = this.dimColor1();
    var color2 = this.dimColor2();
    var ww1 = Math.ceil(ww * 0.25)
    var ww2 = Math.ceil(ww * 0.75)
    this.contents.gradientFillRect(wx, wy, ww1, wh, color1, color1);
    this.contents.gradientFillRect(ww1, wy, ww2, wh, color1, color2);
};
 
Window_Gab.prototype.drawGabCharacter = function() {
    if (this._graphicName === '') return;
    if (this._graphicType === 'character') {
      var wx = Yanfly.Param.GabCharPosX;
      var wy = Yanfly.Param.GabCharPosY;
      this.drawCharacter(this._graphicName, this._graphicIndex, wx, wy);
    } else if (this._graphicType === 'face') {
      var wx = 0;
      var wy = 0;
      var ww = Window_Base._faceWidth;
      var wh = this.lineHeight() * 2;
      this.drawFace(this._graphicName, this._graphicIndex, wx, wy, ww, wh);
    }
};
 
Window_Gab.prototype.drawGabText = function() {
    var text = this._text;
    if (this._graphicType === 'character') {
      var wx = Yanfly.Param.GabCharPosX * 2;
    } else if (this._graphicType === 'face') {
      var wx = Window_Base._faceWidth + this.standardPadding();
    } else {
      var wx = this.standardPadding();
    }
    var wy = this.contents.height / 2 - this.lineHeight() / 2;
    this.drawTextEx(text, wx, wy);
};
 
Window_Gab.prototype.playSound = function() {
    var sound = {
      name:   this._soundName,
      volume: 90,
      pitch:  100,
      pan:    0
    };
    AudioManager.playSe(sound);
};
 
Window_Gab.prototype.storeGabs = function() {
    if (this._battle) {
      this.storeBattleGabs();
    } else {
      this.storeMapGabs();
    }
};
 
Window_Gab.prototype.storeBattleGabs = function() {
    $gameTemp._storedBattleGabs = this._gabQueue.slice();
    if (this.contentsOpacity > 0) {
      $gameTemp._currentBattleGab = this._currentGab.slice();
    } else {
      $gameTemp._currentBattleGab = [];
    }
};
 
Window_Gab.prototype.storeMapGabs = function() {
    $gameTemp._storedMapGabs = this._gabQueue.slice();
    if (this.contentsOpacity > 0) {
      $gameTemp._currentMapGab = this._currentGab.slice();
    } else {
      $gameTemp._currentMapGab = [];
    }
};
 
Window_Gab.prototype.restoreGabs = function() {
    if (this._battle) {
      this.restoreBattleGabs();
    } else {
      this.restoreMapGabs();
    }
};
 
Window_Gab.prototype.restoreBattleGabs = function() {
    if ($gameTemp._storedBattleGabs) {
      this._gabQueue = $gameTemp._storedBattleGabs;
      $gameTemp._storedBattleGabs = undefined;
    }
    if ($gameTemp._currentBattleGab && $gameTemp._currentBattleGab.length > 0) {
      this._gabQueue.unshift($gameTemp._currentBattleGab);
      $gameTemp._currentBattleGab = undefined;
    }
};
 
Window_Gab.prototype.restoreMapGabs = function() {
    if ($gameTemp._storedMapGabs) {
      this._gabQueue = $gameTemp._storedMapGabs;
      $gameTemp._storedMapGabs = undefined;
    }
    if ($gameTemp._currentMapGab && $gameTemp._currentMapGab.length > 0) {
      this._gabQueue.unshift($gameTemp._currentMapGab);
      $gameTemp._currentMapGab = undefined;
    }
};
 
//=============================================================================
// SceneManager
//=============================================================================
 
Yanfly.Gab.SceneManager_push = SceneManager.push;
SceneManager.push = function(sceneClass) {
    if (this.isStoreGabs(sceneClass)) {
      this._scene._gabWindow.storeGabs();
    }
    Yanfly.Gab.SceneManager_push.call(this, sceneClass);
};
 
SceneManager.isStoreGabs = function(sceneClass) {
    if (!this.isSceneMap() && !this.isSceneBattle()) return false;
    if (sceneClass === Scene_Map) {
      if (this.isSceneMap()) return false;
    } else if (sceneClass === Scene_Battle) {
      if (this.isSceneMap()) return true;
    }
    return true;
};
 
SceneManager.isSceneMap = function() {
    return this._scene instanceof Scene_Map;
};
 
SceneManager.isSceneBattle = function() {
    return this._scene instanceof Scene_Battle;
};
 
//=============================================================================
// Scene_Base
//=============================================================================
 
Scene_Base.prototype.createGabWindow = function(battle) {
    this._gabWindow = new Window_Gab(battle);
    this.addChild(this._gabWindow);
};
 
Scene_Base.prototype.startGabWindow = function(gabData) {
    this._gabWindow.addGabData(gabData);
};
 
Scene_Base.prototype.forceGabWindow = function(gabData) {
    this._gabWindow.forceGabData(gabData);
};
 
Scene_Base.prototype.clearGabWindow = function() {
    this._gabWindow.clearGabData();
};
 
//=============================================================================
// Scene_Battle
//=============================================================================
 
Yanfly.Gab.Scene_Battle_createAllWindows =
    Scene_Battle.prototype.createAllWindows;
Scene_Battle.prototype.createAllWindows = function() {
    Yanfly.Gab.Scene_Battle_createAllWindows.call(this);
    this.createGabWindow(true);
};
//=============================================================================
// Scene_Map
//=============================================================================
 
Yanfly.Gab.Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
Scene_Map.prototype.createAllWindows = function() {
    Yanfly.Gab.Scene_Map_createAllWindows.call(this);
    this.createGabWindow(false);
};
 
//=============================================================================
// End of File
//=============================================================================
